# Driveway-Hub Development Environment Setup (Windows)

## Overview
This guide outlines how to set up a local development environment for Driveway-Hub on Windows using Docker Desktop. The environment includes PostgreSQL 14 with PostGIS extensions, Redis, and a Node.js/Express.js server (TypeScript). It initializes the `driveway_hub_dev` database with `/database/schema.sql`, which defines tables (`users`, `vehicles`, `driveways`, `bookings`, etc.), stored procedures, and sample data. This setup ensures a reproducible environment for rapid developer onboarding, including for the `POST /api/bookings/create` technical challenge.

## Prerequisites
- **Docker Desktop**: Install from https://www.docker.com/products/docker-desktop/. Enable Hyper-V (default) during setup; WSL 2 is optional and not required.
- **Git**: Install Git for Windows[](https://git-scm.com/download/win).
- **Node.js**: Optional for local npm commands (Node.js 16+, download from https://nodejs.org).
- **Postman**: For testing API endpoints (download from https://www.postman.com/downloads/).
- **Code Editor**: VS Code recommended[](https://code.visualstudio.com/).

## Setup Instructions
1. **Clone the Repository**:
   Open Command Prompt or PowerShell and run:
   ```cmd
   git clone https://github.com/piglet1976/driveway-hub.git
   cd driveway-hub
