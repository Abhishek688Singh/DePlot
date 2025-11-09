  <div align="center">
        <a href="https://github.com/Abhishek688Singh"><img src="https://itshivam.in/api/github-repo?repo=Abhishek688Singh/DePlot&theme=hacker" height="500" /></a>
    </div>

# DePlot

## Project Overview
This project implements a **Gasless Transaction Forwarder**, allowing users to send ERC-20 and ERC-721 transactions without holding ETH. The system consists of a forwarder smart contract, a backend relay service, and a frontend interface for users to interact with the system.

---

## Table of Contents
- [Architecture](#architecture)
- [Features](#features)
- [Setup Guide](#setup-guide)
- [Project Structure](#project-structure)
- [Privacy Measures](#privacy-measures)
- [Technologies Used](#technologies-used)
- [Our Team](#our-team)

---

## Architecture
### 1. Chaincode (JavaScript)
- **`LandContract.js`**: Core smart contract that handles land registration, ownership verification, and property transfer logic on **Hyperledger Fabric**.  
- **`index.js`**: Entry point that registers and exposes the `LandContract` to the blockchain network.

### 2. Backend (Node.js + Express)
- Serves as a middleware between the blockchain network and the frontend.  
- Uses the **Fabric SDK** to submit and query transactions such as land creation, ownership transfer, and history retrieval.  
- Exposes secure **REST APIs** for government registrars and landowners to interact with the blockchain.

### 3. Frontend (React)
- Provides an interactive and user-friendly interface for registrars, landowners, and buyers.  
- Enables users to **buy lands, initiate transfers, approve ownership changes**, and view complete property histories.  

---

## Features
- **Instant Land Status Verification:** Buyers can instantly verify land ownership, registration status, and legal history before purchasing.  
- **Secure Land Registration:** Government registrars can securely register new land records on the blockchain.  
- **Ownership Transfer Workflow:** Owners can initiate transfers, and registrars approve them through verified blockchain transactions.  
- **Role-Based Access Control:** Different access levels for registrars, landowners, and buyers ensure trusted interactions.  
- **Transparent History Tracking:** Every ownership change and transaction is permanently recorded for public verification.  
- **User-Friendly Interface:** React-based UI that allows users to view land details, initiate transfers, and verify authenticity in real time.  

---

## Setup Guide

#### Chaincode
Run the following commands:
```
cd ./DePlot/FABRIC-SAMPLES/test-network/
./network.sh up createChannel -c land -ca
```
Register the org:
```
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/
fabric-ca-client register   --id.name govRegistrar   --id.secret govpw   --id.type client   --id.attrs 'role=gov:ecert'   -u https://localhost:7054   --tls.certfiles ${PWD}/organizations/fabric-ca/org1/tls-cert.pem
fabric-ca-client enroll   -u https://govRegistrar:govpw@localhost:7054   --caname ca-org1   -M ${PWD}/organizations/peerOrganizations/org1.example.com/users/govRegistrar@org1.example.com/msp   --tls.certfiles ${PWD}/organizations/fabric-ca/org1/tls-cert.pem
```
Chain SDK:
```
cd ./DePlot/FABRIC-SAMPLES/fabric-land-backend
node server.js
```

### Prerequisites
Ensure you have the following installed:
- Linux (Ubuntu)
- node.js (v19.19+)
- Docker (v19.03.12+)

### 1. Clone the repository
```bash
git clone <repo_url>
cd ./DePlot/
```

### 2. Chaincode
```bash
cd contracts
./network.sh deployCC -ccn LandContract -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript -c land
. scripts/envVar.sh 
setGlobals 1
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
```

### 3. Backend
```bash
cd backend
npm install
node server.js
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure
```
DePlot/
│-- FABRIC-SAMPLES/          # Javascript Chaincode
│-- backend/                # Javascript backend service
│-- frontend/               # React frontend
│-- README.md               # Project documentation
```

---

## Privacy Measures
- **Off-chain Signing:** Users sign transactions off-chain to avoid exposing private keys.
- **Data Minimization:** Only necessary transaction data is stored.
- **Secure Relayer:** Ensures transactions are relayed securely without tampering.

---

## Technologies Used
- **Frontend:** React, TailwindCSS
- **Backend:** Javascript, Node.js SDK
- **Chaincode:** Javascript
- **Blockchain:** Private chain integration
- **Security:** Hyperledger Fabric security

## Project Demonstration
Watch our project demonstration video here: [YouTube](https://youtu.be/pHNOJeRUE5U?si=BOO7bKruFSp5W5Tv)

---

## Acknowledgment
Special thanks to HACKCBS for organizing this hackathon.
## Our Team
We are a dedicated team of blockchain developers, backend developers, full stack developers, software engineers, and security experts passionate about decentralized finance and improving private blockchain accessibility. Our goal is to create seamless, secure, and efficient blockchain solutions.

- [Abhishek Singh](https://github.com/Abhishek688Singh)
- [Abhishek Tiwari](https://github.com/Abhishek73555)
- [Abhishek Sahu](https://github.com/Abhishek31Sahu)
- [Aakansha Tripathi](https://github.com/Aakansha-Tripathii)


  <div align="center">
        <a href="https://github.com/Abhishek688Singh"><img src="https://itshivam.in/api/github-contributors?repo=Abhishek688Singh/DePlot&theme=neon&layout=carousel" height="240" /></a>
    </div>

---
