#!/bin/bash

ngrok http https://localhost:3443 --request-header-add "ngrok-skip-browser-warning: true" --url=ultimately-cuddly-squid.ngrok-free.app
