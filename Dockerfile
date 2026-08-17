FROM python:3.12-slim

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface
WORKDIR /app

COPY --chown=user server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# bake the model into the image so a waking Space answers immediately
RUN python -c "from huggingface_hub import hf_hub_download as d; \
    d('Xenova/paraphrase-multilingual-MiniLM-L12-v2', 'onnx/model_quantized.onnx'); \
    d('Xenova/paraphrase-multilingual-MiniLM-L12-v2', 'tokenizer.json')"

COPY --chown=user server server
COPY --chown=user dist dist

EXPOSE 7860
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "7860"]
