#!/bin/bash

# Initial Data Setup Script for Dispatch Tool
# This script populates the system with initial data via API calls after a fresh installation
# Run this after: make dev-bg

set -e  # Exit on any error

# Configuration
API_BASE_URL="http://localhost:8000/api"
CALL_CENTER_API_KEY="cc_api_key_change_this_in_production"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to wait for service to be ready
wait_for_service() {
    print_status "Waiting for API service to be ready..."
    for i in {1..30}; do
        if curl -s "$API_BASE_URL/health" > /dev/null 2>&1; then
            print_success "API service is ready!"
            return 0
        fi
        print_status "Waiting... (attempt $i/30)"
        sleep 2
    done
    print_error "API service failed to start within 60 seconds"
    exit 1
}

# Function to login as admin
login_admin() {
    print_status "Logging in as admin..."
    
    response=$(curl -s -X POST "$API_BASE_URL/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@triguardroofing.com",
            "password": "admin123",
            "role": "admin"
        }' \
        --cookie-jar /tmp/admin_cookies.txt)
    
    if echo "$response" | grep -q '"success": true'; then
        print_success "Admin login successful"
        return 0
    else
        print_error "Admin login failed: $response"
        exit 1
    fi
}

# Function to create regions
create_regions() {
    print_status "Creating regions..."
    
    # Regional divisions for Texas-based roofing company
    regions=(
        '{"name": "North Texas", "description": "Northern Texas region including Dallas, Plano, McKinney areas", "is_global": false}'
        '{"name": "South Texas", "description": "Southern Texas region including McAllen, Edinburg, Brownsville areas", "is_global": false}'
        '{"name": "East Texas", "description": "Eastern Texas region including Tyler, Longview, Marshall areas", "is_global": false}'
        '{"name": "West Texas", "description": "Western Texas region including El Paso, Midland, Odessa areas", "is_global": false}'
        '{"name": "Central Texas", "description": "Central Texas region including Austin, San Antonio areas", "is_global": false}'
    )
    
    for region_data in "${regions[@]}"; do
        region_name=$(echo "$region_data" | jq -r '.name')
        print_status "Creating region: $region_name"
        
        response=$(curl -s -X POST "$API_BASE_URL/regions" \
            -H "Content-Type: application/json" \
            --cookie /tmp/admin_cookies.txt \
            -d "$region_data")
        
        if echo "$response" | grep -q '"success": true'; then
            print_success "Region '$region_name' created successfully"
        else
            print_error "Failed to create region '$region_name': $response"
        fi
    done
}

# Function to create teams
create_teams() {
    print_status "Creating teams..."
    
    # Get regions to assign teams to
    regions_response=$(curl -s -X GET "$API_BASE_URL/regions" \
        -H "Content-Type: application/json" \
        --cookie /tmp/admin_cookies.txt)
    
    # Teams with their target regions
    teams=(
        '{"name": "Team Alpha", "description": "Primary response team for North Texas operations", "region_name": "North Texas"}'
        '{"name": "Team Beta", "description": "Specialized team for South Texas region", "region_name": "South Texas"}'
        '{"name": "Team Gamma", "description": "East Texas coverage team", "region_name": "East Texas"}'
        '{"name": "Team Delta", "description": "West Texas operations team", "region_name": "West Texas"}'
        '{"name": "Team Echo", "description": "Central Texas response team", "region_name": "Central Texas"}'
    )
    
    for team_data in "${teams[@]}"; do
        team_name=$(echo "$team_data" | jq -r '.name')
        region_name=$(echo "$team_data" | jq -r '.region_name')
        
        # Find region ID
        region_id=$(echo "$regions_response" | jq -r ".data[] | select(.name == \"$region_name\") | .regionId")
        
        if [ "$region_id" != "null" ] && [ -n "$region_id" ]; then
            team_payload=$(echo "$team_data" | jq ". + {\"region_id\": $region_id} | del(.region_name)")
            
            print_status "Creating team: $team_name (Region: $region_name)"
            
            response=$(curl -s -X POST "$API_BASE_URL/teams" \
                -H "Content-Type: application/json" \
                --cookie /tmp/admin_cookies.txt \
                -d "$team_payload")
            
            if echo "$response" | grep -q '"success": true'; then
                print_success "Team '$team_name' created successfully"
            else
                print_error "Failed to create team '$team_name': $response"
            fi
        else
            print_error "Could not find region '$region_name' for team '$team_name'"
        fi
    done
}

# Function to create dispatchers
create_dispatchers() {
    print_status "Creating dispatchers..."
    
    # Get teams to assign dispatchers to
    teams_response=$(curl -s -X GET "$API_BASE_URL/teams" \
        -H "Content-Type: application/json" \
        --cookie /tmp/admin_cookies.txt)
    
    dispatchers=(
        '{"name": "Pete Stathopoulos", "email": "pete@example.com", "password": "pete123", "phone": "469-555-0001", "team_name": "Team Alpha"}'
        '{"name": "Maria Rodriguez", "email": "maria@example.com", "password": "maria123", "phone": "956-555-0002", "team_name": "Team Beta"}'
        '{"name": "James Wilson", "email": "james@example.com", "password": "james123", "phone": "903-555-0003", "team_name": "Team Gamma"}'
        '{"name": "Sarah Johnson", "email": "sarah@example.com", "password": "sarah123", "phone": "915-555-0004", "team_name": "Team Delta"}'
        '{"name": "Michael Chen", "email": "michael@example.com", "password": "michael123", "phone": "512-555-0005", "team_name": "Team Echo"}'
    )
    
    for dispatcher_data in "${dispatchers[@]}"; do
        dispatcher_name=$(echo "$dispatcher_data" | jq -r '.name')
        team_name=$(echo "$dispatcher_data" | jq -r '.team_name')
        
        # Find team ID
        team_id=$(echo "$teams_response" | jq -r ".data[] | select(.name == \"$team_name\") | .teamId")
        
        if [ "$team_id" != "null" ] && [ -n "$team_id" ]; then
            dispatcher_payload=$(echo "$dispatcher_data" | jq ". + {\"team_id\": $team_id} | del(.team_name)")
            
            print_status "Creating dispatcher: $dispatcher_name (Team: $team_name)"
            
            response=$(curl -s -X POST "$API_BASE_URL/dispatchers" \
                -H "Content-Type: application/json" \
                --cookie /tmp/admin_cookies.txt \
                -d "$dispatcher_payload")
            
            if echo "$response" | grep -q '"success": true'; then
                print_success "Dispatcher '$dispatcher_name' created successfully"
            else
                print_error "Failed to create dispatcher '$dispatcher_name': $response"
            fi
        else
            print_error "Could not find team '$team_name' for dispatcher '$dispatcher_name'"
        fi
    done
}

# Function to create field agents
create_field_agents() {
    print_status "Creating field agents..."
    
    # Get teams to assign agents to
    teams_response=$(curl -s -X GET "$API_BASE_URL/teams" \
        -H "Content-Type: application/json" \
        --cookie /tmp/admin_cookies.txt)
    
    agents=(
        '{"name": "Larey Farias", "email": "larey@example.com", "password": "larey123", "phone": "469-555-1001", "status": "available", "team_name": "Team Alpha", "street_number": "123", "street_name": "Main St", "city": "Dallas", "state_province": "Texas", "postal_code": "75201", "country": "USA"}'
        '{"name": "Arthur Garcia", "email": "arthur@example.com", "password": "arthur123", "phone": "469-555-1002", "status": "available", "team_name": "Team Alpha", "street_number": "456", "street_name": "Elm St", "city": "Dallas", "state_province": "Texas", "postal_code": "75202", "country": "USA"}'
        '{"name": "Jeremy Moreno", "email": "jeremy@example.com", "password": "jeremy123", "phone": "956-555-1003", "status": "available", "team_name": "Team Beta", "street_number": "789", "street_name": "Oak Ave", "city": "Laredo", "state_province": "Texas", "postal_code": "78040", "country": "USA"}'
        '{"name": "Rebecca Stewart", "email": "rebecca@example.com", "password": "rebecca123", "phone": "956-555-1004", "status": "available", "team_name": "Team Beta", "street_number": "321", "street_name": "Pine St", "city": "Laredo", "state_province": "Texas", "postal_code": "78041", "country": "USA"}'
        '{"name": "David Thompson", "email": "david@example.com", "password": "david123", "phone": "903-555-1005", "status": "available", "team_name": "Team Gamma", "street_number": "654", "street_name": "Cedar Rd", "city": "Tyler", "state_province": "Texas", "postal_code": "75701", "country": "USA"}'
        '{"name": "Lisa Chen", "email": "lisa@example.com", "password": "lisa123", "phone": "915-555-1006", "status": "available", "team_name": "Team Delta", "street_number": "987", "street_name": "Maple Dr", "city": "El Paso", "state_province": "Texas", "postal_code": "79901", "country": "USA"}'
        '{"name": "Robert Johnson", "email": "robert@example.com", "password": "robert123", "phone": "512-555-1007", "status": "available", "team_name": "Team Echo", "street_number": "147", "street_name": "Congress Ave", "city": "Austin", "state_province": "Texas", "postal_code": "78701", "country": "USA"}'
        '{"name": "Jennifer Wilson", "email": "jennifer@example.com", "password": "jennifer123", "phone": "512-555-1008", "status": "available", "team_name": "Team Echo", "street_number": "258", "street_name": "6th St", "city": "Austin", "state_province": "Texas", "postal_code": "78702", "country": "USA"}'
    )
    
    for agent_data in "${agents[@]}"; do
        agent_name=$(echo "$agent_data" | jq -r '.name')
        team_name=$(echo "$agent_data" | jq -r '.team_name')
        
        # Find team ID
        team_id=$(echo "$teams_response" | jq -r ".data[] | select(.name == \"$team_name\") | .teamId")
        
        if [ "$team_id" != "null" ] && [ -n "$team_id" ]; then
            agent_payload=$(echo "$agent_data" | jq ". + {\"team_id\": $team_id} | del(.team_name)")
            
            print_status "Creating field agent: $agent_name (Team: $team_name)"
            
            response=$(curl -s -X POST "$API_BASE_URL/agents" \
                -H "Content-Type: application/json" \
                --cookie /tmp/admin_cookies.txt \
                -d "$agent_payload")
            
            if echo "$response" | grep -q '"success": true'; then
                print_success "Field agent '$agent_name' created successfully"
            else
                print_error "Failed to create field agent '$agent_name': $response"
            fi
        else
            print_error "Could not find team '$team_name' for agent '$agent_name'"
        fi
    done
}

# Function to create sample appointments via call center API
create_sample_appointments() {
    print_status "Creating sample appointments via call center API..."
    
    # Get regions for appointment assignment
    regions_response=$(curl -s -X GET "$API_BASE_URL/regions" \
        -H "Content-Type: application/json" \
        --cookie /tmp/admin_cookies.txt)
    
    # Sample appointments with different regions
    appointments=(
        '{"customer": {"name": "John Smith", "email": "john.smith@example.com", "phone": "469-555-2001"}, "location": {"latitude": 33.1811789, "longitude": -96.6291685, "postal_code": "75069", "street_name": "Bay Street", "street_number": "100", "city": "McKinney", "state_province": "Texas", "country": "USA"}, "booking": {"booking_date": "2025-09-23", "booking_time": "09:00:00"}, "region_name": "North Texas", "call_center_agent": {"name": "Sarah Johnson", "email": "sarah.cc@callcenter.com"}}'
        '{"customer": {"name": "Maria Lopez", "email": "maria.lopez@example.com", "phone": "956-555-2002"}, "location": {"latitude": 26.1936248, "longitude": -98.2118124, "postal_code": "78502", "street_name": "Broadway", "street_number": "500", "city": "McAllen", "state_province": "Texas", "country": "USA"}, "booking": {"booking_date": "2025-09-23", "booking_time": "10:30:00"}, "region_name": "South Texas", "call_center_agent": {"name": "Mike Rodriguez", "email": "mike.cc@callcenter.com"}}'
        '{"customer": {"name": "Robert Davis", "email": "robert.davis@example.com", "phone": "903-555-2003"}, "location": {"latitude": 32.3513, "longitude": -95.3011, "postal_code": "75702", "street_name": "Main Street", "street_number": "200", "city": "Tyler", "state_province": "Texas", "country": "USA"}, "booking": {"booking_date": "2025-09-23", "booking_time": "14:00:00"}, "region_name": "East Texas", "call_center_agent": {"name": "Lisa Chen", "email": "lisa.cc@callcenter.com"}}'
        '{"customer": {"name": "Jennifer Wilson", "email": "jennifer.wilson@example.com", "phone": "915-555-2004"}, "location": {"latitude": 31.7619, "longitude": -106.485, "postal_code": "79901", "street_name": "Mesa Street", "street_number": "300", "city": "El Paso", "state_province": "Texas", "country": "USA"}, "booking": {"booking_date": "2025-09-23", "booking_time": "11:00:00"}, "region_name": "West Texas", "call_center_agent": {"name": "David Thompson", "email": "david.cc@callcenter.com"}}'
        '{"customer": {"name": "Michael Brown", "email": "michael.brown@example.com", "phone": "512-555-2005"}, "location": {"latitude": 30.2672, "longitude": -97.7431, "postal_code": "78701", "street_name": "Congress Avenue", "street_number": "400", "city": "Austin", "state_province": "Texas", "country": "USA"}, "booking": {"booking_date": "2025-09-23", "booking_time": "15:30:00"}, "region_name": "Central Texas", "call_center_agent": {"name": "Amanda Walker", "email": "amanda.cc@callcenter.com"}}'
        '{"customer": {"name": "Global Customer", "email": "global.customer@example.com", "phone": "800-555-2006"}, "location": {"latitude": 32.7767, "longitude": -96.7970, "postal_code": "75201", "street_name": "Elm Street", "street_number": "500", "city": "Dallas", "state_province": "Texas", "country": "USA"}, "booking": {"booking_date": "2025-09-23", "booking_time": "16:00:00"}, "region_name": "Global", "call_center_agent": {"name": "Jennifer Lee", "email": "jennifer.cc@callcenter.com"}}'
    )
    
    for appointment_data in "${appointments[@]}"; do
        customer_name=$(echo "$appointment_data" | jq -r '.customer.name')
        region_name=$(echo "$appointment_data" | jq -r '.region_name')
        
        # Find region ID
        region_id=$(echo "$regions_response" | jq -r ".data[] | select(.name == \"$region_name\") | .regionId")
        
        if [ "$region_id" != "null" ] && [ -n "$region_id" ]; then
            appointment_payload=$(echo "$appointment_data" | jq ".booking += {\"region_id\": $region_id} | del(.region_name)")
            
            print_status "Creating appointment for: $customer_name (Region: $region_name)"
            
            response=$(curl -s -X POST "$API_BASE_URL/call-center/booking" \
                -H "Content-Type: application/json" \
                -H "X-API-Key: $CALL_CENTER_API_KEY" \
                -d "$appointment_payload")
            
            if echo "$response" | grep -q '"success": true'; then
                print_success "Appointment for '$customer_name' created successfully"
                if echo "$response" | grep -q '"warning"'; then
                    warning_msg=$(echo "$response" | jq -r '.warning')
                    print_warning "$warning_msg"
                fi
            else
                print_error "Failed to create appointment for '$customer_name': $response"
            fi
        else
            print_error "Could not find region '$region_name' for appointment '$customer_name'"
        fi
    done
}

# Main execution
main() {
    echo "=================================================="
    echo "   Dispatch Tool - Initial Data Setup Script"
    echo "=================================================="
    echo ""
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed. Please install jq first."
        exit 1
    fi
    
    # Check if curl is installed
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed. Please install curl first."
        exit 1
    fi
    
    print_status "Starting initial data setup..."
    
    wait_for_service
    login_admin
    create_regions
    create_teams
    create_dispatchers
    create_field_agents
    create_sample_appointments
    
    echo ""
    echo "=================================================="
    print_success "Initial data setup completed successfully!"
    echo "=================================================="
    echo ""
    print_status "You can now access the system with:"
    echo "  • Admin: admin@triguardroofing.com / admin123"
    echo "  • Dispatchers: pete@triguardroofing.com / pete123 (and others)"
    echo "  • Field Agents: larey@triguardroofing.com / larey123 (and others)"
    echo ""
    print_status "The system now includes:"
    echo "  • 6 Regions (Global + 5 Texas regions)"
    echo "  • 5 Teams (one per region)"
    echo "  • 5 Dispatchers (one per team)"
    echo "  • 8 Field Agents (distributed across teams)"
    echo "  • 6 Sample appointments (one per region)"
    echo ""
    
    # Cleanup
    rm -f /tmp/admin_cookies.txt
}

# Run main function
main "$@"