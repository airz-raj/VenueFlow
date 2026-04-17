FROM nginx:alpine

# Copy static assets into nginx serving directory
COPY . /usr/share/nginx/html

# Expose port 80 (Cloud Run listens on 8080 by default, but respects EXPOSE)
# Copy the configuration template for envsubst dynamic port binding
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Alternatively, Google Cloud Run passes the $PORT environment variable.
# Let's use a simpler approach that dynamically binds to $PORT
CMD ["/bin/sh", "-c", "envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
