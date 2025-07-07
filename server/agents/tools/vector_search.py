"""
Vector Search Tool
Searches the private cloud knowledge base using semantic similarity
"""

import asyncio
import json
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from ..core.tool_registry import BaseTool, ToolResult

logger = logging.getLogger(__name__)

class VectorSearchTool(BaseTool):
    """
    Vector search tool for querying the cloud services knowledge base
    Uses semantic similarity to find relevant information
    """
    
    def __init__(self):
        super().__init__(
            name="vector_search",
            description="Search cloud services knowledge base using semantic similarity",
            category="search"
        )
        
        # Initialize vector database connection (mock for now)
        self.vector_db = None
        self.embedding_model = None
        
        # Mock knowledge base for demonstration
        self.knowledge_base = [
            {
                "id": "aws_ec2_1",
                "title": "AWS EC2 Instance Types",
                "content": "Amazon EC2 provides various instance types optimized for different use cases. General Purpose instances (t3, m5) provide balanced compute, memory, and networking. Compute Optimized instances (c5) are ideal for CPU-intensive applications.",
                "service": "ec2",
                "provider": "aws",
                "category": "compute",
                "tags": ["instance", "types", "compute", "cpu", "memory"],
                "url": "https://docs.aws.amazon.com/ec2/instance-types/"
            },
            {
                "id": "aws_s3_1",
                "title": "AWS S3 Storage Classes",
                "content": "Amazon S3 offers different storage classes for different use cases: Standard for frequently accessed data, Infrequent Access for less frequently accessed data, and Glacier for archival storage.",
                "service": "s3",
                "provider": "aws",
                "category": "storage",
                "tags": ["storage", "classes", "archival", "glacier"],
                "url": "https://docs.aws.amazon.com/s3/storage-classes/"
            },
            {
                "id": "azure_vm_1",
                "title": "Azure Virtual Machine Sizes",
                "content": "Azure Virtual Machines come in various sizes and series. B-series for burstable workloads, D-series for general purpose computing, and F-series for compute-intensive workloads.",
                "service": "virtual-machines",
                "provider": "azure",
                "category": "compute",
                "tags": ["vm", "sizes", "series", "burstable", "compute"],
                "url": "https://docs.microsoft.com/azure/virtual-machines/sizes"
            },
            {
                "id": "aws_lambda_1",
                "title": "AWS Lambda Function Configuration",
                "content": "AWS Lambda functions can be configured with memory from 128MB to 10GB. CPU power scales linearly with memory allocation. Timeout can be set up to 15 minutes for Lambda functions.",
                "service": "lambda",
                "provider": "aws",
                "category": "serverless",
                "tags": ["lambda", "memory", "timeout", "configuration"],
                "url": "https://docs.aws.amazon.com/lambda/configuration/"
            },
            {
                "id": "azure_functions_1",
                "title": "Azure Functions Scaling",
                "content": "Azure Functions automatically scale based on demand. Consumption plan provides automatic scaling, while Premium plan offers pre-warmed instances and VNet connectivity.",
                "service": "functions",
                "provider": "azure",
                "category": "serverless",
                "tags": ["functions", "scaling", "consumption", "premium"],
                "url": "https://docs.microsoft.com/azure/azure-functions/functions-scale"
            }
        ]

    async def execute(self, query: str, context: Any) -> ToolResult:
        """Execute vector search on the knowledge base"""
        
        start_time = datetime.now()
        
        try:
            # Perform semantic search
            search_results = await self._semantic_search(query, context)
            
            # Filter and rank results
            filtered_results = await self._filter_results(search_results, context)
            
            # Extract sources
            sources = [result.get("url", "") for result in filtered_results if result.get("url")]
            
            # Calculate confidence based on result quality
            confidence = await self._calculate_confidence(query, filtered_results)
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            return ToolResult(
                tool_name=self.name,
                success=True,
                results=filtered_results,
                sources=sources,
                confidence=confidence,
                response_time=response_time,
                metadata={
                    "total_results": len(search_results),
                    "filtered_results": len(filtered_results),
                    "search_type": "semantic"
                }
            )
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            response_time = (datetime.now() - start_time).total_seconds()
            
            return ToolResult(
                tool_name=self.name,
                success=False,
                results=[],
                sources=[],
                confidence=0.0,
                response_time=response_time,
                error_message=str(e)
            )

    async def _semantic_search(self, query: str, context: Any) -> List[Dict[str, Any]]:
        """Perform semantic search on the knowledge base"""
        
        # Mock semantic search implementation
        # In production, this would use actual vector embeddings
        
        query_lower = query.lower()
        results = []
        
        for item in self.knowledge_base:
            # Calculate similarity score based on keyword matching
            # This is a simplified version - real implementation would use embeddings
            score = await self._calculate_similarity(query_lower, item)
            
            if score > 0.1:  # Minimum relevance threshold
                result = item.copy()
                result["similarity_score"] = score
                results.append(result)
        
        # Sort by similarity score
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        return results

    async def _calculate_similarity(self, query: str, item: Dict[str, Any]) -> float:
        """Calculate similarity between query and knowledge base item"""
        
        # Simple keyword-based similarity (mock implementation)
        query_words = set(query.split())
        
        # Check title, content, and tags
        title_words = set(item["title"].lower().split())
        content_words = set(item["content"].lower().split())
        tag_words = set(item.get("tags", []))
        
        # Calculate overlap scores
        title_overlap = len(query_words.intersection(title_words)) / len(query_words) if query_words else 0
        content_overlap = len(query_words.intersection(content_words)) / len(query_words) if query_words else 0
        tag_overlap = len(query_words.intersection(tag_words)) / len(query_words) if query_words else 0
        
        # Weighted similarity score
        similarity = (title_overlap * 0.4 + content_overlap * 0.4 + tag_overlap * 0.2)
        
        return similarity

    async def _filter_results(self, results: List[Dict[str, Any]], context: Any) -> List[Dict[str, Any]]:
        """Filter and enhance search results based on context"""
        
        filtered = []
        
        # Get user preferences from context
        user_preferences = getattr(context, 'user_preferences', {})
        preferred_provider = user_preferences.get('preferred_cloud_provider', None)
        
        # Detect query context
        detected_providers = getattr(context, 'detected_providers', [])
        detected_services = getattr(context, 'detected_services', [])
        
        for result in results[:10]:  # Limit to top 10 results
            # Apply provider filtering
            if preferred_provider and result.get('provider') == preferred_provider:
                result['relevance_boost'] = 0.2
            elif detected_providers and result.get('provider') in detected_providers:
                result['relevance_boost'] = 0.1
            else:
                result['relevance_boost'] = 0.0
            
            # Apply service filtering
            if detected_services:
                for service_info in detected_services:
                    if ':' in service_info:
                        category, service = service_info.split(':', 1)
                        if (result.get('category') == category or 
                            service.lower() in result.get('content', '').lower()):
                            result['relevance_boost'] += 0.1
            
            # Update final score
            result['final_score'] = result['similarity_score'] + result['relevance_boost']
            
            # Format result for output
            formatted_result = {
                "title": result["title"],
                "content": result["content"],
                "service": result["service"],
                "provider": result["provider"],
                "category": result["category"],
                "url": result.get("url", ""),
                "score": result["final_score"],
                "source": "knowledge_base"
            }
            
            filtered.append(formatted_result)
        
        # Sort by final score
        filtered.sort(key=lambda x: x["score"], reverse=True)
        
        return filtered[:5]  # Return top 5 results

    async def _calculate_confidence(self, query: str, results: List[Dict[str, Any]]) -> float:
        """Calculate confidence in the search results"""
        
        if not results:
            return 0.0
        
        # Base confidence on top result score
        top_score = results[0].get("score", 0.0) if results else 0.0
        
        # Boost confidence if multiple relevant results
        if len(results) >= 3:
            confidence = min(0.9, top_score + 0.2)
        elif len(results) >= 2:
            confidence = min(0.8, top_score + 0.1)
        else:
            confidence = min(0.7, top_score)
        
        return confidence

    async def validate_input(self, query: str, context: Any) -> bool:
        """Validate if the tool can handle the input"""
        
        if not query or not query.strip():
            return False
        
        # Check if query is related to cloud services
        cloud_keywords = ['aws', 'azure', 'cloud', 'ec2', 's3', 'lambda', 'vm', 'storage', 'compute']
        query_lower = query.lower()
        
        return any(keyword in query_lower for keyword in cloud_keywords)

    async def add_to_knowledge_base(self, item: Dict[str, Any]) -> bool:
        """Add new item to the knowledge base"""
        
        try:
            # Validate required fields
            required_fields = ["id", "title", "content", "service", "provider", "category"]
            if not all(field in item for field in required_fields):
                return False
            
            # Add to knowledge base
            self.knowledge_base.append(item)
            
            logger.info(f"Added item {item['id']} to knowledge base")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add item to knowledge base: {e}")
            return False

    async def update_knowledge_base_item(self, item_id: str, updates: Dict[str, Any]) -> bool:
        """Update existing knowledge base item"""
        
        try:
            for i, item in enumerate(self.knowledge_base):
                if item["id"] == item_id:
                    self.knowledge_base[i].update(updates)
                    logger.info(f"Updated knowledge base item {item_id}")
                    return True
            
            logger.warning(f"Knowledge base item {item_id} not found")
            return False
            
        except Exception as e:
            logger.error(f"Failed to update knowledge base item: {e}")
            return False

    async def remove_from_knowledge_base(self, item_id: str) -> bool:
        """Remove item from knowledge base"""
        
        try:
            original_length = len(self.knowledge_base)
            self.knowledge_base = [item for item in self.knowledge_base if item["id"] != item_id]
            
            if len(self.knowledge_base) < original_length:
                logger.info(f"Removed item {item_id} from knowledge base")
                return True
            else:
                logger.warning(f"Knowledge base item {item_id} not found")
                return False
                
        except Exception as e:
            logger.error(f"Failed to remove knowledge base item: {e}")
            return False

    def get_knowledge_base_stats(self) -> Dict[str, Any]:
        """Get statistics about the knowledge base"""
        
        stats = {
            "total_items": len(self.knowledge_base),
            "providers": {},
            "categories": {},
            "services": {}
        }
        
        for item in self.knowledge_base:
            # Count by provider
            provider = item.get("provider", "unknown")
            stats["providers"][provider] = stats["providers"].get(provider, 0) + 1
            
            # Count by category
            category = item.get("category", "unknown")
            stats["categories"][category] = stats["categories"].get(category, 0) + 1
            
            # Count by service
            service = item.get("service", "unknown")
            stats["services"][service] = stats["services"].get(service, 0) + 1
        
        return stats

    async def search_by_filters(self, filters: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        """Search knowledge base using specific filters"""
        
        results = []
        
        for item in self.knowledge_base:
            match = True
            
            # Apply filters
            for key, value in filters.items():
                if key in item:
                    if isinstance(value, list):
                        if item[key] not in value:
                            match = False
                            break
                    else:
                        if item[key] != value:
                            match = False
                            break
            
            if match:
                results.append(item)
        
        return results[:limit]