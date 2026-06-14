FROM nginx:alpine

# Copy custom secure Nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy application files to Nginx directory
COPY . /usr/share/nginx/html

# Clean up configuration file from web root
RUN rm -f /usr/share/nginx/html/default.conf

# Expose the Cloud Run port
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
