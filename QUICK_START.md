# ⚡ Quick Start Reference

**Last Updated:** February 24, 2026

---

## 🚀 Start Everything (In Order)

### 1. Start Database
```bash
# From project root
docker compose up -d
```

### 2. Start AI Service (Ollama)
```bash
# Make sure Ollama is installed first
ollama pull llama3.1:8b
# Ollama should auto-start on system
```

### 3. Start Backend
```bash
cd Backend
npm install     # First time only
npm run build
npm run db:migrate   # First time only
npm start
```

**Expected:** `[info] Server booted {"port":3000}`

### 4. Start Frontend
```bash
cd Frontend
npm install     # First time only
npm run dev
```

**Expected:** Opens at `http://localhost:5173`

---

## 🔍 Verify Everything Works

- [ ] Database: `docker ps` shows `pr-review-db`
- [ ] Backend: Visit `http://localhost:3000/health`
- [ ] Frontend: Visit `http://localhost:5173`
- [ ] Ollama: `ollama list` shows `llama3.1:8b`

---

## 🛑 Stop Everything

```bash
# Stop frontend (Ctrl+C in terminal)
# Stop backend (Ctrl+C in terminal)

# Stop database
docker compose down

# Ollama runs as system service
```

---

## ⚠️ Known Issues

**Frontend shows mock data only** - Backend REST API not implemented yet  
**Can't login** - Authentication not implemented  
**Webhook testing requires ngrok** - See [STARTUP_GUIDE.md](STARTUP_GUIDE.md)

See [ISSUES_AND_GAPS.md](ISSUES_AND_GAPS.md) for complete issue list.

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| [STARTUP_GUIDE.md](STARTUP_GUIDE.md) | Detailed setup instructions |
| [ISSUES_AND_GAPS.md](ISSUES_AND_GAPS.md) | Complete issue analysis |
| Backend/.env | Backend configuration |
| Frontend/.env | Frontend configuration |
| docker.compose.yaml | Database setup |

---

## 🆘 Troubleshooting

**Backend won't start**
```bash
# Check if database is running
docker ps

# Rebuild
cd Backend
npm run build
npm run db:migrate
```

**Frontend blank screen**
- Check browser console (F12)
- Verify `VITE_USE_MOCK_API=true` in Frontend/.env

**Database connection failed**
```bash
# Restart database
docker compose restart

# Check logs
docker logs pr-review-db
```

---

## 📞 Need Help?

Check the detailed guides:
1. **Setup Issues** → [STARTUP_GUIDE.md](STARTUP_GUIDE.md)
2. **Missing Features** → [ISSUES_AND_GAPS.md](ISSUES_AND_GAPS.md)
3. **Backend Architecture** → [Backend/BACKEND_PROGRESS_NOTES.md](Backend/BACKEND_PROGRESS_NOTES.md)
4. **Database Info** → [DB.md](DB.md)
