# Logic Lords + 'YUKTI'

A crowdsourced civic issue reporting and resolution system featuring a citizen-facing PWA and an admin dashboard for municipal staff.

## Tech Stack
- Frontend: HTML, Tailwind CSS, JavaScript (PWA-ready), Leaflet, Chart.js
- Backend: Node.js, Express, Socket.io
- Database: MongoDB (Mongoose)
- Cloud Storage: Cloudinary (default) or AWS S3 for images/audio
- APIs: REST (GraphQL-ready)
- AI/ML: tfjs-node for classification scaffolding (replace with production model)

## Monorepo Structure
```
backend/
  src/
    ai/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
    server.js
frontend/
  citizen-panel/
  admin-panel/
shared/
  (types, constants)
```

## Getting Started (Development)

1) Prerequisites
- Node.js >= 18, npm >= 9
- MongoDB local or remote

2) Environment Variables
Create backend/.env from the template:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/civic-issue-tracker
JWT_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
FRONTEND_URL=http://localhost:3000
# Uploads
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
# AWS (only if using S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=
```

3) Install Backend Dependencies
```
cd backend
npm install
npm run dev
```

4) Open Frontend
- Serve frontend statically via any server (e.g., Live Server) or add a simple static server later.
- Citizen: frontend/citizen-panel/index.html
- Admin: frontend/admin-panel/index.html

## Suggested Libraries
- Security: helmet, express-rate-limit, cors
- Uploads: multer + cloudinary/multer-storage-cloudinary or multer-s3 + aws-sdk
- Realtime: socket.io
- Validation: express-validator
- Auth: jsonwebtoken, bcryptjs
- Mapping: leaflet
- Charts: chart.js
- Logging: winston + morgan

## AI Integration Plan
- Start with heuristic + keyword-based classification (implemented scaffolding in src/ai/classificationService.js)
- Replace with a trained model: export a TensorFlow model and load via tfjs-node
- Feature fusion: combine image embeddings (CNN) + text embeddings (e.g., USE) to a classifier head
- Add confidence threshold and human-in-the-loop review queue for low-confidence predictions
- Continuous learning: periodically retrain with labeled resolutions

## Automated Routing Plan
- Map predicted category to department
- Use priority + SLA to enqueue tasks
- Notify assigned department via email/SMS, and push realtime updates to citizen via Socket.io

## Analytics & Reporting
- Aggregations implemented in analyticsService.js (category distribution, resolution time, heatmap)
- Extend to export CSV/PDF and scheduled daily summaries

## Next Steps
- Add controllers for issues/auth/users
- Implement frontend JS for forms and map
- Add GraphQL schema if desired
- Add Dockerfile and CI

