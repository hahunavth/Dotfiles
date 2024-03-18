#!/bin/bash


if [ $# -lt 2 ]; then
    echo "Usage: $0 <command> <dataset_slug>"
    echo "   <command>      - Type of command (e.g., datasets, competitions)"
    echo "   <dataset_slug> - Username and dataset name (e.g., username/dataset-name)"
    exit 1
fi

type="$1"
dataset_slug="$2"

validate_dataset_slug() {
    if [[ $1 =~ ^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$ ]]; then
        return 0  # Valid dataset slug
    else
        return 1  # Invalid dataset slug
    fi
}

if validate_dataset_slug "$dataset_slug"; then
    username=$(echo "$dataset_slug" | cut -d'/' -f1)
    dataset_name=$(echo "$dataset_slug" | cut -d'/' -f2)

    echo username $username
    echo dataset_name $dataset_name
    
    destination_folder="/kaggle/input/$dataset_name"

    if [ -d "$destination_folder" ]; then
        read -p "Destination folder '$destination_folder' already exists. Do you want to override it? (y/n): " choice
        if [ "$choice" != "y" ]; then
            echo "Download aborted."
            exit 0
        fi
    fi

    kaggle $type download --unzip --path "$destination_folder" "$dataset_slug"
else
    echo "Invalid dataset slug format. Please provide a valid slug in the format 'username/dataset-name'."
fi

