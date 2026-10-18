FROM o1c-angular-sandbox-python:20261017
COPY sandbox_backend /app/sandbox_backend
CMD ["uvicorn", "sandbox_backend.runtime:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
