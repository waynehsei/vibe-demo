from app.constant import OPENAI_API_KEY
from langchain_core.messages import SystemMessage
from langgraph.graph import MessagesState
from langchain_openai import ChatOpenAI
from app.repository import fetch_docs, MATERIAL_STORE
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from typing import List
from langchain_core.messages import AIMessage

llm = ChatOpenAI(model="gpt-4o", openai_api_key=OPENAI_API_KEY)

class CitedAnswer(BaseModel):
    """Answer the user question based only on the given sources, and cite the sources used."""
    answer: str = Field(
        ...,
        description="The answer to the user question, which is based only on the given sources.",
    )
    context: str = Field(
        ...,
        description="The context of the answer, which is based only on the given sources.",
    )
    citations: List[str] = Field(
        ...,
        description="The string IDs of the SPECIFIC sources which justify the answer.",
    )

@tool
def retrieve(query: str):
    """Retrieve information related to a query."""
    retrieved_docs = fetch_docs(query)
    serialized = "\n\n".join([
        f"Source: {doc.metadata['source']}\nInformation: {doc.page_content}"
        for doc in retrieved_docs
    ])
    return serialized

def query_or_respond(state: MessagesState):
    llm_with_tools = llm.bind_tools([retrieve])
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def generate(state: MessagesState):
    structured_llm = llm.with_structured_output(CitedAnswer)
    recent_tool_messages = []
    for message in reversed(state["messages"]):
        if message.type == "tool":
            recent_tool_messages.append(message)
        else:
            break
    tool_messages = recent_tool_messages[::-1]

    # Format into prompt
    docs_content = "\n".join(doc.content for doc in tool_messages)

    print(docs_content)

    system_message_content = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context"
        "to answer the question. If you don't know the answer, answer the question youself."
        "Use three sentences maximum and keep the answer concise."
        "\n"
        f"{docs_content}"
    )
    conversation_messages = [
        message
        for message in state["messages"]
        if message.type in ("human", "system")
        or (message.type == "ai" and not message.tool_calls)
    ]
    prompt = [SystemMessage(system_message_content)] + conversation_messages

    response = structured_llm.invoke(prompt)
    
    # Get valid file_ids from material store
    valid_file_ids = [file_id for file_id, _ in MATERIAL_STORE.materials]
    
    # Filter citations to only include valid file_ids
    filtered_citations = [citation for citation in response.citations if citation in valid_file_ids]
    
    message = AIMessage(content=response.answer, additional_kwargs={"citations": filtered_citations, "context": response.context})
    return {"messages": [message]}
