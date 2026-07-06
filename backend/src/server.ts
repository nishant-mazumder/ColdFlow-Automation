import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import strategiesRoutes from './routes/strategies';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import historyRoutes from './routes/history';
import leadsRoutes from './routes/leads';
import notificationsRoutes from './routes/notifications';
import accountsRoutes from './routes/accounts';

dotenv.config();

// Initialize Express App - schema refreshed
const app = express();
app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/strategies', strategiesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/accounts', accountsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
