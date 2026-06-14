FROM nginx:alpine

# Copy application files to Nginx directory
COPY . /usr/share/nginx/html

# Update Nginx config to listen on port 8080 (required by Cloud Run)
RUN sed -i 's/listen\(.*\)80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

# Expose the Cloud Run port
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
