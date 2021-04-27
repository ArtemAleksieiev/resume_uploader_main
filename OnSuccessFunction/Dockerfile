FROM amazon/aws-lambda-python:3.8

RUN /var/lang/bin/python3.8 -m pip install --upgrade pip

COPY requirements.txt .
RUN pip install -r requirements.txt
RUN python -m spacy download en_core_web_sm

COPY app.py skills.csv ./

CMD [ "app.lambda_handler" ]