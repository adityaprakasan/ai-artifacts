# Code Interpreter Template for Data Analysis
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install core data analysis packages
RUN pip3 install --no-cache-dir \
    numpy \
    pandas \
    matplotlib \
    seaborn \
    scipy \
    scikit-learn

# Install specific Plotly and Kaleido versions for compatibility
RUN pip3 install --no-cache-dir \
    plotly==5.18.0 \
    kaleido==0.2.1

# Install Excel file support
RUN pip3 install --no-cache-dir \
    openpyxl \
    xlrd

# Install additional useful packages for data analysis
RUN pip3 install --no-cache-dir \
    statsmodels \
    jupyter \
    ipython

# Set working directory
WORKDIR /home/user

# Copy template files to the container
COPY . /home/user

# Ensure proper permissions for file operations
RUN chmod -R 755 /home/user
