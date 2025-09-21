# Region-Based Queue System Implementation

## Overview
This document outlines the implementation of a comprehensive region-based queue system for the dispatch tool. The system allows for geographical organization of teams and appointments, improving workflow efficiency and reducing cross-regional appointment assignments.

## System Architecture

### Database Changes

#### New Tables
1. **regions** - Core region definitions
   - `regionId` (INT, PRIMARY KEY, AUTO_INCREMENT)
   - `name` (VARCHAR(100), UNIQUE, NOT NULL)
   - `description` (TEXT)
   - `is_global` (BOOLEAN, DEFAULT FALSE)
   - `created_time` (TIMESTAMP)
   - `updated_time` (TIMESTAMP)

#### Modified Tables
1. **teams** - Added region assignment
   - `region_id` (INT, FOREIGN KEY → regions.regionId)
   - Default: Global region (regionId = 1)

2. **bookings** - Added region assignment
   - `region_id` (INT, FOREIGN KEY → regions.regionId)
   - Default: Global region (regionId = 1)

#### Migration File
Location: `/mysql/init/region_migration.sql`
- Creates regions table with sample data
- Adds foreign key relationships
- Migrates existing data to Global region
- Creates performance indexes

### Backend Changes

#### New API Endpoints (`/backend/routes/regions.py`)
- `GET /api/regions` - List all regions with team/booking counts
- `POST /api/regions` - Create new region (admin only)
- `GET /api/regions/{id}` - Get specific region with teams
- `PUT /api/regions/{id}` - Update region (admin only)
- `DELETE /api/regions/{id}` - Delete region (admin only, moves data to Global)
- `POST /api/regions/{id}/teams` - Assign team to region (admin only)

#### Modified API Endpoints
1. **Teams API** (`/backend/routes/teams.py`)
   - Enhanced all endpoints to include region information
   - Added region assignment support in team creation/updates
   - Region validation for team assignments

2. **Bookings API** (`/backend/routes/booking.py`)
   - Enhanced booking queries with region filtering
   - Dispatcher access control based on team region
   - Admin can filter by specific regions
   - Region information included in all booking responses

3. **Call Center API** (`/backend/routes/booking.py`)
   - **BREAKING CHANGE**: Region selection now REQUIRED
   - Validation prevents appointments without region
   - Warning system for Global region selection
   - Enhanced error messages for region-related issues

### Frontend Changes

#### New Components
1. **RegionManagement** (`/frontend/src/components/RegionManagement.tsx`)
   - Complete CRUD interface for regions
   - Team assignment/reassignment functionality
   - Global region protection (cannot be deleted)
   - Bulk team management per region

#### Modified Components
1. **AdminManagement** - Added Regions tab
2. **NewAppointmentModal** - Added required region selection with warning
3. **DispatcherScreen** - Split into Global/Team appointment queues
4. **AdminScreen** - Added region-based filtering

#### API Updates
- `getAllBookings()` supports optional region filtering
- Enhanced Booking interface with region fields
- Region validation in booking creation

## User Experience Changes

### Admin Users
- **New**: Complete region management interface
- **New**: Can filter appointments by region
- **New**: Can assign/reassign teams between regions
- **Enhanced**: Team management shows region assignments

### Dispatcher Users
- **New**: Separate "Global Appointments" and "Team Appointments" tabs
- **Changed**: Can only see bookings in their team's region OR global bookings
- **Enhanced**: Clear separation of regional vs global workflow

### Call Center Users
- **BREAKING**: Must select a region for every appointment
- **New**: Warning when selecting Global region
- **Enhanced**: Better workflow guidance for regional assignments

### Field Agent Users
- **No Change**: Still only see their assigned bookings
- Appointments inherit region from assignment process

## Business Logic

### Region Assignment Rules
1. **Default Behavior**: All new entities default to Global region
2. **Team Assignment**: Teams can only be in one region at a time
3. **Booking Visibility**:
   - Dispatchers see their team's regional bookings + all global bookings
   - Admins can filter by any region or see all
   - Field agents only see their assigned bookings (unchanged)

### Global Region Special Rules
- Cannot be deleted
- Accessible by all teams
- Not recommended for normal workflow (warnings provided)
- Used as fallback for orphaned data

### Access Control
- **Region Management**: Admin only
- **Team Assignment**: Admin only
- **Booking Assignment**: Admin and Dispatchers (within their region)
- **Regional Filtering**: Admin only (dispatchers auto-filtered)

## Migration Strategy

### Database Migration
1. Run `/mysql/init/region_migration.sql`
2. Verifies all existing data moves to Global region
3. Creates sample regional structure
4. Establishes proper foreign key constraints

### Application Deployment
1. **Backend**: Deploy new region endpoints and enhanced APIs
2. **Frontend**: Deploy enhanced UI with region support
3. **Testing**: Verify region assignment and filtering works
4. **Training**: Brief users on new regional workflow

## Testing Checklist

### Database
- [x] Migration creates regions table correctly
- [x] Foreign key constraints are properly established
- [x] Existing data migrates to Global region
- [x] Sample data structure is reasonable

### Backend APIs
- [x] Region CRUD operations work correctly
- [x] Team assignment respects region boundaries
- [x] Booking filtering by region functions properly
- [x] Access control enforced correctly
- [x] Call center region requirement implemented

### Frontend Interface
- [x] Admin can manage regions completely
- [x] Dispatcher sees appropriate regional separation
- [x] Appointment creation requires region selection
- [x] Warning system works for Global region
- [x] Team management shows regional assignments

### User Workflows
- [ ] Admin creates region and assigns teams
- [ ] Call center creates appointments in specific regions
- [ ] Dispatchers see appropriate regional/global separation
- [ ] Agents receive assignments normally
- [ ] Cross-regional appointments are prevented/warned

## Configuration

### Environment Variables
No new environment variables required.

### Default Data
- Global region (ID: 1) - Auto-created
- Sample regions: North Texas, South Texas, East Texas, West Texas
- Existing teams distributed across sample regions

## Security Considerations

### Access Control
- Region management restricted to admin users
- Dispatchers cannot see outside their regional scope
- Field agents maintain existing access patterns

### Data Validation
- Region ID validation on all booking operations
- Team assignment validation prevents orphaned relationships
- Global region protection prevents system corruption

## Performance Considerations

### Database Indexes
- `idx_teams_region` - Optimizes team-by-region queries
- `idx_bookings_region` - Optimizes booking-by-region queries

### Query Optimization
- Region filtering applied at database level
- Minimized N+1 queries in region management
- Efficient team/booking counting for admin interface

## Future Enhancements

### Potential Improvements
1. **Geographic Boundaries**: Actual map-based region definitions
2. **Auto-Assignment**: Automatic region assignment based on address
3. **Regional Analytics**: Performance metrics per region
4. **Multi-Region Teams**: Teams that can operate across regions
5. **Regional Notifications**: Region-specific communication systems

### API Extensibility
- Region hierarchy support (sub-regions)
- Region-based user preferences
- Regional scheduling constraints
- Cross-regional collaboration features

## Rollback Plan

### If Issues Occur
1. **Database**: Restore from backup before migration
2. **Application**: Revert to previous deployment
3. **Data Recovery**: All data preserved in Global region
4. **User Impact**: System reverts to single-queue operation

### Emergency Procedures
- Global region always accessible as fallback
- Admin can reassign all teams to Global region
- Booking system continues to function without regional filtering

---

## Implementation Summary

The region-based queue system provides a comprehensive solution for geographical organization of dispatch operations. The implementation maintains backward compatibility while adding powerful new organizational capabilities. The system is designed to scale and can be extended with additional regional features as business needs evolve.

**Key Benefits:**
- Improved workflow organization
- Reduced cross-regional appointments
- Better team management
- Enhanced administrative control
- Maintained system reliability

**Breaking Changes:**
- Call center must select region for all new appointments
- Dispatcher interface reorganized into regional tabs

**Migration Requirements:**
- Database migration script execution
- User training on new interface
- Regional team assignment by admin