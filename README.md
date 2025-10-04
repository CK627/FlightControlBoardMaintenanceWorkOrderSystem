# Flight Control Board Maintenance Work Order System

A comprehensive web-based maintenance work order management system for flight control boards.

## Quick Start

### Method 1: Using PHP Built-in Server (Development)

```bash
# Navigate to project directory
cd FlightControlBoardMaintenanceWorkOrderSystem

# Start PHP server
php -S localhost:8000

# Access the system
open http://localhost:8000/login.html
```

### Method 2: Using Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the system
open http://localhost:8000
```

### Method 3: Manual Setup

1. **Configure Database**
   ```bash
   # Edit database configuration
   vim config/mysql.ini
   ```

2. **Initialize Database**
   - Visit: `http://localhost:8000/database-init.html`
   - Click "Initialize Database"

3. **Login**
   - Username: `admin`
   - Password: `123456`

## Configuration Methods

### Method 1: Database Configuration

Edit `config/mysql.ini`:
```ini
[database]
host = 127.0.0.1
user = root
password = "123456"
database = fcbmwos
port = 3306
charset = utf8
```

### Method 2: Application Configuration

Edit `config/app-config.ini`:
```ini
[database]
initialized = false
```

### Method 3: Environment Variables

```bash
export DB_HOST=127.0.0.1
export DB_USER=root
export DB_PASSWORD=123456
export DB_NAME=fcbmwos
```

## Usage Methods

### Method 1: Web Interface

1. **Login**: Access `http://localhost:8000/login.html`
2. **Dashboard**: View work orders and statistics
3. **Create Work Order**: Fill form and submit
4. **Manage Records**: Update status and add notes

### Method 2: API Integration

```javascript
// Get work order list
fetch('/api/fcbmwo.php/list')
  .then(response => response.json())
  .then(data => console.log(data));

// Create work order
fetch('/api/fcbmwo.php', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    user: 'engineer1',
    work_order_no: 'FCBMWO-001',
    description: 'Repair description'
  })
});
```

### Method 3: Command Line Tools

```bash
# Database backup
mysqldump -u root -p fcbmwos > backup.sql

# Database restore
mysql -u root -p fcbmwos < backup.sql

# System health check
curl http://localhost:8000/api/config-manager.php?key=database.initialized
```

## Features

- ✅ Work Order Management
- ✅ User Authentication
- ✅ Database Auto-initialization
- ✅ RESTful API
- ✅ Responsive Design
- ✅ Multi-language Support
- ✅ Export/Import Functions

## System Requirements

- PHP 7.4+
- MySQL 5.7+
- Web Server (Apache/Nginx/PHP Built-in)

## Project Structure

```
├── api/                 # Backend API endpoints
├── config/             # Configuration files
├── css/                # Stylesheets
├── js/                 # JavaScript files
├── images/             # Static images
├── database-init.html  # Database initialization page
├── login.html         # Login page
├── index.html         # Main dashboard
└── 使用说明.md        # Chinese documentation
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

This project is licensed under the MIT License.

## Support

For detailed Chinese documentation, see [使用说明.md](./使用说明.md)

---

**Version**: 1.0.0  
**Last Updated**: October 2025