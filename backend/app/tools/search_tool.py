from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from app.tools.base import BaseTool, ToolResult
from app.models.enums import RiskLevel


class SearchInput(BaseModel):
    query: str = Field(..., min_length=1, description="Search query string")
    max_results: int = Field(default=5, ge=1, le=20)


class SearchTool(BaseTool):
    def __init__(self, search_adapter=None):
        super().__init__(
            name="search.web",
            version="1.0.0",
            description="Searches technical documentation, repositories, and web resources.",
            capabilities=["search_web"],
            default_risk=RiskLevel.LOW,
            required_permissions=["network:search"],
            input_schema=SearchInput,
        )
        self.search_adapter = search_adapter

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        query = args.get("query", "")
        max_results = args.get("max_results", 5)

        if self.search_adapter:
            return await self.search_adapter.search(query, max_results)

        # Default Mock Search Adapter for tests / offline runs
        mock_results = [
            {
                "title": f"Documentation for '{query}'",
                "url": f"https://docs.example.org/search?q={query}",
                "snippet": f"Official documentation and API reference for {query} with configuration guides and code examples.",
            },
            {
                "title": f"Best Practices & Architecture for '{query}'",
                "url": f"https://guides.example.org/{query.lower().replace(' ', '-')}",
                "snippet": f"Comprehensive architectural breakdown, dependency management, and design patterns for {query}.",
            },
        ]

        return ToolResult(
            success=True,
            data={"query": query, "results": mock_results[:max_results], "is_mock": True},
        )
