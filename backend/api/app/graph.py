
from langgraph.prebuilt import ToolNode
from langgraph.graph import MessagesState, StateGraph
from app.agent import retrieve
from langgraph.graph import END
from langgraph.prebuilt import ToolNode, tools_condition
from app.agent import query_or_respond, generate
from langgraph.checkpoint.memory import MemorySaver


def create_graph():
    memory = MemorySaver()
    graph_builder = StateGraph(MessagesState)
    graph_builder.add_node(query_or_respond)
    graph_builder.add_node(ToolNode([retrieve]))
    graph_builder.add_node(generate)

    graph_builder.set_entry_point("query_or_respond")
    graph_builder.add_conditional_edges(
        "query_or_respond",
        tools_condition,
        {END: END, "tools": "tools"},
    )
    graph_builder.add_edge("tools", "generate")
    graph_builder.add_edge("generate", END)

    graph = graph_builder.compile(checkpointer=memory)
    return graph

GRAPH = create_graph()
