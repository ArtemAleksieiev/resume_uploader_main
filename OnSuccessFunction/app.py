import boto3
import pandas as pd
import spacy
import json
import re
import os
import datetime

nlp = spacy.load('en_core_web_sm')

def lambda_handler(event, context):
    #print("Received event key1: " + event['key1'])
    print(os.environ.get('DbTable'))
    text_resume = extract_text(event['key1'])
    fname = event['key2']
    lname = event['key3']
    resume = event['key4']
    print(fname, lname)
    print(text_resume)
    phone = extract_mobile_number(text_resume)
    print (phone)
    email = extract_email(text_resume)
    print(email)
    skillslist = extract_skills(text_resume)
    print(skillslist)
    print('Skillslist type:', type(skillslist))
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ.get('DbTable'))
    table.put_item(
        Item={
            'id': datetime.datetime.now().strftime("%s"),
            'fname': fname,
            'lname': lname,
            'phone': phone,
            'email': email,
            'skills': skillslist,
            'resume': resume
        }
    )



    return 'Success'  # Echo back the first key value

def extract_text(received):
    text = [line.replace('\t', ' ') for line in received.split('\n') if line]
    return ' '.join(text)


def extract_mobile_number(text):
    phone = re.findall(re.compile(r'(?:(?:\+?([1-9]|[0-9][0-9]|[0-9][0-9][0-9])\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([0-9][1-9]|[0-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?'), text)
    
    if phone:
        number = ''.join(phone[0])
        if len(number) > 10:
            return '+' + number
        else:
            return number

def extract_email(email):
    email = re.findall("([^@|\s]+@[^@]+\.[^@|\s]+)", email)
    if email:
        try:
            return email[0].split()[0].strip(';')
        except IndexError:
            return None

def extract_skills(resume_text):
    print('Start execution')
    nlp_text = nlp(resume_text)
    all_stopwords = nlp.Defaults.stop_words
    
    # removing stop words and implementing word tokenization
    #text_tokens = word_tokenize(resume_text)
    #tokens = [word for word in text_tokens if not word in all_stopwords]
    print("Parent type:", type(nlp_text))
    print("Token type:", type(nlp_text[0]))

    tokens = [t for t in nlp_text if not t.is_stop]
    print("Parent type:", type(tokens))
    print("Token type:", type(tokens[0]))
    print(tokens)

    # reading the csv file
    data = pd.read_csv("skills.csv") 
    #print(data)
    # extract values
    skills = list(data.columns.values)
    #print(skills)
    skillset = []
    
    # check for one-grams (example: python)
    for tok in tokens:
        if tok.text.lower() in skills:
            skillset.append(tok)
    #print(skillset)
    #print("Noun_Chunks:", type(nlp_text.noun_chunks))
    # check for bi-grams and tri-grams (example: machine learning)
    #for toke in nlp_text.noun_chunks:
    #    toke = toke.text.lower().strip()
    #    if toke in skills:
    #        skillset.append(toke)
    #print('Skillset: ',skillset)
    #print('Skillset[0]', skillset[0])
    #print('type of skillset[3]', type(skillset[3]))
    #for skill in skillset:
    #    print(type(skill))

    return [i.capitalize() for i in set([i.text.lower() for i in skillset])]
