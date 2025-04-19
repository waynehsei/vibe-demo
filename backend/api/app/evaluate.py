from langchain.evaluation import load_evaluator
from langchain_openai import ChatOpenAI
from app.constant import OPENAI_API_KEY
from langchain.schema.messages import HumanMessage
from typing import List

llm = ChatOpenAI(model="gpt-4o", openai_api_key=OPENAI_API_KEY)

def evaluate_answer(input: str, prediction: str, reference: str):
    if not reference:
        hh_criteria = {
            "helpful": "The assistant's answer should be helpful to the user."
        }
        evaluator = load_evaluator("score_string", criteria=hh_criteria)
        eval_result = evaluator.evaluate_strings(
            prediction=prediction,
            input=input,
        )
    else:
        evaluator = load_evaluator("score_string", llm=llm)
        eval_result = evaluator.evaluate_strings(
            prediction=prediction,
            input=input,
            reference=reference
        )
    return eval_result["score"]

def summarize_messages(docs: List[str]):
    prompt = f"""
    You are a helpful assistant that summarizes and provide insights from a 
    conversation between a user and an AI.
    The conversation is provided in the following:
    {docs}
    The answer should be no more than 100 words.
    Your Answer:
    """
    
    response = llm.invoke([
        HumanMessage(content=prompt)
    ])
    return response.content
