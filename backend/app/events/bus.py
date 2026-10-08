from abc import ABC, abstractmethod
from typing import Dict, Set, Callable, Awaitable, Any, Optional
import asyncio
import logging

logger = logging.getLogger("agentic_os.events")


class BaseEventBus(ABC):
    """
    Abstract Event Bus interface supporting publish/subscribe with failure isolation.
    """

    @abstractmethod
    async def publish(self, channel: str, event: Dict[str, Any]) -> None:
        """Publishes an event dictionary to a specified channel."""
        pass

    @abstractmethod
    async def subscribe(
        self,
        channel: str,
        callback: Callable[[Dict[str, Any]], Awaitable[None]]
    ) -> None:
        """Subscribes an async callback to a channel."""
        pass

    @abstractmethod
    async def unsubscribe(
        self,
        channel: str,
        callback: Callable[[Dict[str, Any]], Awaitable[None]]
    ) -> None:
        """Unsubscribes a callback from a channel."""
        pass


class InMemoryEventBus(BaseEventBus):
    """
    In-process asynchronous event bus with subscriber error isolation.
    """

    def __init__(self):
        # channel -> set of async callbacks
        self._subscribers: Dict[str, Set[Callable[[Dict[str, Any]], Awaitable[None]]]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(
        self,
        channel: str,
        callback: Callable[[Dict[str, Any]], Awaitable[None]]
    ) -> None:
        async with self._lock:
            if channel not in self._subscribers:
                self._subscribers[channel] = set()
            self._subscribers[channel].add(callback)
            logger.debug(f"Subscribed callback {getattr(callback, '__name__', str(callback))} to channel '{channel}'")

    async def unsubscribe(
        self,
        channel: str,
        callback: Callable[[Dict[str, Any]], Awaitable[None]]
    ) -> None:
        async with self._lock:
            if channel in self._subscribers:
                self._subscribers[channel].discard(callback)
                if not self._subscribers[channel]:
                    del self._subscribers[channel]
                logger.debug(f"Unsubscribed callback {getattr(callback, '__name__', str(callback))} from channel '{channel}'")

    async def publish(self, channel: str, event: Dict[str, Any]) -> None:
        """
        Broadcasts event to:
        1. Exact channel subscribers
        2. Wildcard '*' / 'system' subscribers
        All subscriber invocations are isolated so errors do not crash the publisher.
        """
        callbacks_to_invoke: Set[Callable[[Dict[str, Any]], Awaitable[None]]] = set()

        async with self._lock:
            # Exact channel
            if channel in self._subscribers:
                callbacks_to_invoke.update(self._subscribers[channel])
            # Wildcard channel
            if "*" in self._subscribers:
                callbacks_to_invoke.update(self._subscribers["*"])
            # System channel if different
            if channel != "system" and "system" in self._subscribers:
                callbacks_to_invoke.update(self._subscribers["system"])

        if not callbacks_to_invoke:
            return

        for callback in callbacks_to_invoke:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)  # type: ignore
            except Exception as exc:
                logger.error(
                    f"EventBus subscriber {getattr(callback, '__name__', str(callback))} failed on channel '{channel}': {exc}",
                    exc_info=True
                )


# Global singleton instance
_event_bus: Optional[BaseEventBus] = None


def get_event_bus() -> BaseEventBus:
    global _event_bus
    if _event_bus is None:
        _event_bus = InMemoryEventBus()
    return _event_bus


def reset_event_bus_for_testing() -> None:
    global _event_bus
    _event_bus = InMemoryEventBus()
