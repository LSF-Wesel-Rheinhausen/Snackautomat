FROM python:3.11-alpine
LABEL authors="Jan Sellerbeck, Robin Busch"
LABEL description="A Docker image for Brokering the Vereinsflieger API and the club snackautomat. Also provides a cache for the Vereinsflieger API to reduce requests."
LABEL version="1.0.0"
LABEL maintainer="Jan Sellerbeck, Robin Busch"
LABEL name="Vereinsflieger/Snack Broker"
ENTRYPOINT ["top", "-b"]
COPY . /broker
WORKDIR /broker
#RUN apt-get update && apt-get install -y python3 python3-pip
COPY /broker/requirements.txt .
RUN python -m pip install --upgrade pip setuptools wheel \
 && pip install --no-cache-dir -r requirements.txt
EXPOSE 8123
CMD ["python3", "broker/main.py"]
ENV FLASK_ENV=production
# End of Dockerfile