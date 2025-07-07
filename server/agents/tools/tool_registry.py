"""
Tool Registry and Management System
Manages all available tools for the Agentic RAG system
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, Protocol
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class Tool(Protocol):
    """Protocol defining the interface for all tools"""
    
    name: str
    description: str
    category: str
    
    async def execute(self, query: str, context: Any) -> Dict[str, Any]:
        """Execute the tool with given query and context"""
        ...
    
    async def validate_input(self, query: str, context: Any) -> bool:
        """Validate if the tool can handle the input"""
        ...

@dataclass
class ToolMetadata:
    name: str
    description: str
    category: str
    version: str
    author: str
    created_at: datetime
    last_used: Optional[datetime] = None
    usage_count: int = 0
    success_rate: float = 0.0
    average_response_time: float = 0.0

@dataclass
class ToolResult:
    tool_name: str
    success: bool
    results: List[Dict[str, Any]]
    sources: List[str]
    confidence: float
    response_time: float
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class BaseTool(ABC):
    """Base class for all tools"""
    
    def __init__(self, name: str, description: str, category: str):
        self.name = name
        self.description = description
        self.category = category
        self.metadata = ToolMetadata(
            name=name,
            description=description,
            category=category,
            version="1.0.0",
            author="System",
            created_at=datetime.now()
        )
    
    @abstractmethod
    async def execute(self, query: str, context: Any) -> ToolResult:
        """Execute the tool"""
        pass
    
    async def validate_input(self, query: str, context: Any) -> bool:
        """Default validation - can be overridden"""
        return bool(query and query.strip())
    
    def update_metrics(self, success: bool, response_time: float):
        """Update tool performance metrics"""
        self.metadata.usage_count += 1
        self.metadata.last_used = datetime.now()
        
        # Update success rate
        if self.metadata.usage_count == 1:
            self.metadata.success_rate = 1.0 if success else 0.0
        else:
            current_successes = self.metadata.success_rate * (self.metadata.usage_count - 1)
            if success:
                current_successes += 1
            self.metadata.success_rate = current_successes / self.metadata.usage_count
        
        # Update average response time
        if self.metadata.usage_count == 1:
            self.metadata.average_response_time = response_time
        else:
            total_time = self.metadata.average_response_time * (self.metadata.usage_count - 1)
            self.metadata.average_response_time = (total_time + response_time) / self.metadata.usage_count

class ToolRegistry:
    """
    Central registry for managing all tools in the system
    Provides tool discovery, selection, and performance tracking
    """
    
    def __init__(self):
        self.tools: Dict[str, BaseTool] = {}
        self.tool_categories: Dict[str, List[str]] = {}
        self.tool_performance: Dict[str, Dict[str, Any]] = {}
        
        # Tool selection strategies
        self.selection_strategies = {
            "performance": self._select_by_performance,
            "category": self._select_by_category,
            "relevance": self._select_by_relevance,
            "hybrid": self._select_hybrid
        }
        
        logger.info("Tool Registry initialized")

    def register_tool(self, tool: BaseTool) -> bool:
        """Register a new tool"""
        
        try:
            if tool.name in self.tools:
                logger.warning(f"Tool {tool.name} already registered, updating...")
            
            self.tools[tool.name] = tool
            
            # Update category mapping
            if tool.category not in self.tool_categories:
                self.tool_categories[tool.category] = []
            
            if tool.name not in self.tool_categories[tool.category]:
                self.tool_categories[tool.category].append(tool.name)
            
            # Initialize performance tracking
            self.tool_performance[tool.name] = {
                "total_calls": 0,
                "successful_calls": 0,
                "failed_calls": 0,
                "average_response_time": 0.0,
                "last_used": None,
                "error_patterns": []
            }
            
            logger.info(f"Tool {tool.name} registered successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register tool {tool.name}: {e}")
            return False

    def unregister_tool(self, tool_name: str) -> bool:
        """Unregister a tool"""
        
        try:
            if tool_name not in self.tools:
                logger.warning(f"Tool {tool_name} not found for unregistration")
                return False
            
            tool = self.tools[tool_name]
            
            # Remove from tools
            del self.tools[tool_name]
            
            # Remove from category mapping
            if tool.category in self.tool_categories:
                if tool_name in self.tool_categories[tool.category]:
                    self.tool_categories[tool.category].remove(tool_name)
                
                # Remove empty categories
                if not self.tool_categories[tool.category]:
                    del self.tool_categories[tool.category]
            
            # Remove performance data
            if tool_name in self.tool_performance:
                del self.tool_performance[tool_name]
            
            logger.info(f"Tool {tool_name} unregistered successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unregister tool {tool_name}: {e}")
            return False

    def get_tool(self, tool_name: str) -> Optional[BaseTool]:
        """Get a specific tool by name"""
        return self.tools.get(tool_name)

    def get_tools_by_category(self, category: str) -> List[BaseTool]:
        """Get all tools in a specific category"""
        
        tool_names = self.tool_categories.get(category, [])
        return [self.tools[name] for name in tool_names if name in self.tools]

    def list_all_tools(self) -> List[str]:
        """List all registered tool names"""
        return list(self.tools.keys())

    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a tool"""
        
        if tool_name not in self.tools:
            return None
        
        tool = self.tools[tool_name]
        performance = self.tool_performance.get(tool_name, {})
        
        return {
            "name": tool.name,
            "description": tool.description,
            "category": tool.category,
            "metadata": {
                "version": tool.metadata.version,
                "author": tool.metadata.author,
                "created_at": tool.metadata.created_at.isoformat(),
                "last_used": tool.metadata.last_used.isoformat() if tool.metadata.last_used else None,
                "usage_count": tool.metadata.usage_count,
                "success_rate": tool.metadata.success_rate,
                "average_response_time": tool.metadata.average_response_time
            },
            "performance": performance
        }

    async def select_tools(self, query: str, context: Any, 
                          strategy: str = "hybrid", max_tools: int = 5) -> List[str]:
        """
        Select appropriate tools for a given query using specified strategy
        """
        
        if strategy not in self.selection_strategies:
            logger.warning(f"Unknown selection strategy: {strategy}, using hybrid")
            strategy = "hybrid"
        
        try:
            selected_tools = await self.selection_strategies[strategy](
                query, context, max_tools
            )
            
            logger.info(f"Selected {len(selected_tools)} tools using {strategy} strategy")
            return selected_tools
            
        except Exception as e:
            logger.error(f"Tool selection failed: {e}")
            return []

    async def _select_by_performance(self, query: str, context: Any, 
                                   max_tools: int) -> List[str]:
        """Select tools based on performance metrics"""
        
        # Sort tools by success rate and response time
        tool_scores = []
        
        for tool_name, tool in self.tools.items():
            if await tool.validate_input(query, context):
                # Calculate performance score
                success_rate = tool.metadata.success_rate
                response_time = tool.metadata.average_response_time
                usage_count = tool.metadata.usage_count
                
                # Normalize response time (lower is better)
                time_score = 1.0 / (1.0 + response_time) if response_time > 0 else 1.0
                
                # Weight by usage count (more usage = more reliable)
                usage_weight = min(1.0, usage_count / 10.0)
                
                score = (success_rate * 0.5 + time_score * 0.3 + usage_weight * 0.2)
                tool_scores.append((tool_name, score))
        
        # Sort by score and return top tools
        tool_scores.sort(key=lambda x: x[1], reverse=True)
        return [tool_name for tool_name, _ in tool_scores[:max_tools]]

    async def _select_by_category(self, query: str, context: Any, 
                                max_tools: int) -> List[str]:
        """Select tools based on query type and categories"""
        
        # Map query types to tool categories
        category_mapping = {
            "troubleshooting": ["search", "analysis", "diagnostic"],
            "comparison": ["search", "analysis", "comparison"],
            "configuration": ["search", "documentation", "tutorial"],
            "performance": ["search", "analysis", "monitoring"],
            "general_inquiry": ["search", "general"]
        }
        
        query_type = getattr(context, 'query_type', 'general_inquiry')
        if hasattr(query_type, 'value'):
            query_type = query_type.value
        
        relevant_categories = category_mapping.get(query_type, ["search", "general"])
        
        selected_tools = []
        for category in relevant_categories:
            category_tools = self.get_tools_by_category(category)
            for tool in category_tools:
                if len(selected_tools) >= max_tools:
                    break
                if await tool.validate_input(query, context):
                    selected_tools.append(tool.name)
        
        return selected_tools[:max_tools]

    async def _select_by_relevance(self, query: str, context: Any, 
                                 max_tools: int) -> List[str]:
        """Select tools based on query relevance"""
        
        # Simple keyword-based relevance
        query_lower = query.lower()
        
        relevance_scores = []
        for tool_name, tool in self.tools.items():
            if await tool.validate_input(query, context):
                # Calculate relevance based on tool description
                description_lower = tool.description.lower()
                
                # Count keyword matches
                query_words = set(query_lower.split())
                description_words = set(description_lower.split())
                
                common_words = query_words.intersection(description_words)
                relevance = len(common_words) / len(query_words) if query_words else 0
                
                relevance_scores.append((tool_name, relevance))
        
        # Sort by relevance and return top tools
        relevance_scores.sort(key=lambda x: x[1], reverse=True)
        return [tool_name for tool_name, _ in relevance_scores[:max_tools]]

    async def _select_hybrid(self, query: str, context: Any, 
                           max_tools: int) -> List[str]:
        """Hybrid selection combining multiple strategies"""
        
        # Get selections from different strategies
        performance_tools = await self._select_by_performance(query, context, max_tools)
        category_tools = await self._select_by_category(query, context, max_tools)
        relevance_tools = await self._select_by_relevance(query, context, max_tools)
        
        # Combine and score tools
        tool_scores = {}
        
        # Weight different strategies
        weights = {"performance": 0.4, "category": 0.4, "relevance": 0.2}
        
        for i, tool_name in enumerate(performance_tools):
            score = weights["performance"] * (max_tools - i) / max_tools
            tool_scores[tool_name] = tool_scores.get(tool_name, 0) + score
        
        for i, tool_name in enumerate(category_tools):
            score = weights["category"] * (max_tools - i) / max_tools
            tool_scores[tool_name] = tool_scores.get(tool_name, 0) + score
        
        for i, tool_name in enumerate(relevance_tools):
            score = weights["relevance"] * (max_tools - i) / max_tools
            tool_scores[tool_name] = tool_scores.get(tool_name, 0) + score
        
        # Sort by combined score
        sorted_tools = sorted(tool_scores.items(), key=lambda x: x[1], reverse=True)
        return [tool_name for tool_name, _ in sorted_tools[:max_tools]]

    async def execute_tool(self, tool_name: str, query: str, context: Any) -> ToolResult:
        """Execute a specific tool and track performance"""
        
        if tool_name not in self.tools:
            return ToolResult(
                tool_name=tool_name,
                success=False,
                results=[],
                sources=[],
                confidence=0.0,
                response_time=0.0,
                error_message=f"Tool {tool_name} not found"
            )
        
        tool = self.tools[tool_name]
        start_time = datetime.now()
        
        try:
            # Validate input
            if not await tool.validate_input(query, context):
                return ToolResult(
                    tool_name=tool_name,
                    success=False,
                    results=[],
                    sources=[],
                    confidence=0.0,
                    response_time=0.0,
                    error_message="Input validation failed"
                )
            
            # Execute tool
            result = await tool.execute(query, context)
            
            # Calculate response time
            response_time = (datetime.now() - start_time).total_seconds()
            
            # Update tool metrics
            tool.update_metrics(result.success, response_time)
            
            # Update registry performance tracking
            self._update_performance_tracking(tool_name, result.success, response_time)
            
            return result
            
        except Exception as e:
            response_time = (datetime.now() - start_time).total_seconds()
            
            # Update metrics for failure
            tool.update_metrics(False, response_time)
            self._update_performance_tracking(tool_name, False, response_time, str(e))
            
            logger.error(f"Tool {tool_name} execution failed: {e}")
            
            return ToolResult(
                tool_name=tool_name,
                success=False,
                results=[],
                sources=[],
                confidence=0.0,
                response_time=response_time,
                error_message=str(e)
            )

    def _update_performance_tracking(self, tool_name: str, success: bool, 
                                   response_time: float, error_message: str = None):
        """Update performance tracking data"""
        
        if tool_name not in self.tool_performance:
            return
        
        perf = self.tool_performance[tool_name]
        
        perf["total_calls"] += 1
        perf["last_used"] = datetime.now().isoformat()
        
        if success:
            perf["successful_calls"] += 1
        else:
            perf["failed_calls"] += 1
            if error_message:
                perf["error_patterns"].append({
                    "error": error_message,
                    "timestamp": datetime.now().isoformat()
                })
                # Keep only last 10 errors
                perf["error_patterns"] = perf["error_patterns"][-10:]
        
        # Update average response time
        if perf["total_calls"] == 1:
            perf["average_response_time"] = response_time
        else:
            total_time = perf["average_response_time"] * (perf["total_calls"] - 1)
            perf["average_response_time"] = (total_time + response_time) / perf["total_calls"]

    def get_registry_stats(self) -> Dict[str, Any]:
        """Get overall registry statistics"""
        
        total_tools = len(self.tools)
        total_categories = len(self.tool_categories)
        
        # Calculate overall performance
        total_calls = sum(perf["total_calls"] for perf in self.tool_performance.values())
        total_successes = sum(perf["successful_calls"] for perf in self.tool_performance.values())
        
        overall_success_rate = total_successes / total_calls if total_calls > 0 else 0.0
        
        return {
            "total_tools": total_tools,
            "total_categories": total_categories,
            "total_calls": total_calls,
            "overall_success_rate": overall_success_rate,
            "categories": list(self.tool_categories.keys()),
            "most_used_tools": self._get_most_used_tools(5),
            "best_performing_tools": self._get_best_performing_tools(5)
        }

    def _get_most_used_tools(self, limit: int) -> List[Dict[str, Any]]:
        """Get most frequently used tools"""
        
        usage_data = []
        for tool_name, perf in self.tool_performance.items():
            usage_data.append({
                "name": tool_name,
                "usage_count": perf["total_calls"],
                "success_rate": perf["successful_calls"] / perf["total_calls"] if perf["total_calls"] > 0 else 0
            })
        
        usage_data.sort(key=lambda x: x["usage_count"], reverse=True)
        return usage_data[:limit]

    def _get_best_performing_tools(self, limit: int) -> List[Dict[str, Any]]:
        """Get best performing tools by success rate"""
        
        performance_data = []
        for tool_name, perf in self.tool_performance.items():
            if perf["total_calls"] >= 5:  # Only consider tools with sufficient usage
                success_rate = perf["successful_calls"] / perf["total_calls"]
                performance_data.append({
                    "name": tool_name,
                    "success_rate": success_rate,
                    "usage_count": perf["total_calls"],
                    "avg_response_time": perf["average_response_time"]
                })
        
        performance_data.sort(key=lambda x: x["success_rate"], reverse=True)
        return performance_data[:limit]

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all registered tools"""
        
        health_status = {
            "overall_status": "healthy",
            "total_tools": len(self.tools),
            "healthy_tools": 0,
            "unhealthy_tools": 0,
            "tool_status": {}
        }
        
        for tool_name, tool in self.tools.items():
            try:
                # Simple health check - validate with empty query
                is_healthy = await tool.validate_input("test", None)
                
                if is_healthy:
                    health_status["healthy_tools"] += 1
                    health_status["tool_status"][tool_name] = "healthy"
                else:
                    health_status["unhealthy_tools"] += 1
                    health_status["tool_status"][tool_name] = "unhealthy"
                    
            except Exception as e:
                health_status["unhealthy_tools"] += 1
                health_status["tool_status"][tool_name] = f"error: {str(e)}"
        
        if health_status["unhealthy_tools"] > 0:
            health_status["overall_status"] = "degraded"
        
        if health_status["healthy_tools"] == 0:
            health_status["overall_status"] = "critical"
        
        return health_status