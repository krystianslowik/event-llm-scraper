import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import eventsRouter from './routes/events';
import scoresRouter from './routes/scores';
import settingsRouter from './routes/settings';
import { initializeRepository } from './services/eventsService';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/events', eventsRouter);
app.use('/scores', scoresRouter);
app.use('/settings', settingsRouter);

const PORT = process.env.PORT || 3000;

initializeRepository().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Server initialization failed:', err);
    process.exit(1);
});