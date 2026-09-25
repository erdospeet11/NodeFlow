from fastapi import FastAPI
from dag import Node, DAG

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.post("/greet")
def greet_user(name: str):
    return {"message": f"Hello, {name}!"}

def main():
    print("Hello from backend!")

if __name__ == "__main__":
    main()