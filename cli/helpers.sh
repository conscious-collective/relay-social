#!/usr/bin/env bash
# Relay Social Helper Functions

# Load config
RELAY_API_URL="${RELAY_API_URL:-http://localhost:3001}"
RELAY_API_KEY="${RELAY_API_KEY:-relay_sk_as9QYJMhyCNTF0sfek_eymB883zaP21S}"
RELAY_ACCOUNTS_MAP="$HOME/.openclaw/workspace/relay-accounts.json"

# Get account ID by name/handle
get_account_id() {
  local name="$1"
  
  # Check mapping file first
  if [[ -f "$RELAY_ACCOUNTS_MAP" ]]; then
    local mapped=$(jq -r ".[\"$name\"] // empty" "$RELAY_ACCOUNTS_MAP" 2>/dev/null)
    if [[ -n "$mapped" ]]; then
      echo "$mapped"
      return 0
    fi
  fi
  
  # Otherwise, search accounts by handle or name
  local accounts=$(curl -s "$RELAY_API_URL/api/accounts" \
    -H "Authorization: Bearer $RELAY_API_KEY")
  
  local account_id=$(echo "$accounts" | jq -r \
    ".accounts[] | select(.handle == \"$name\" or .name == \"$name\" or .handle == \"@$name\") | .id" \
    | head -1)
  
  if [[ -n "$account_id" ]]; then
    echo "$account_id"
    return 0
  fi
  
  return 1
}

# Convert human time to Unix timestamp (milliseconds)
schedule_time() {
  local input="$1"
  
  if [[ "$input" =~ ^([0-9]+)(m|h|d)$ ]]; then
    # Relative time (e.g., "2h", "30m", "1d")
    local value="${BASH_REMATCH[1]}"
    local unit="${BASH_REMATCH[2]}"
    
    case "$unit" in
      m) local seconds=$((value * 60)) ;;
      h) local seconds=$((value * 3600)) ;;
      d) local seconds=$((value * 86400)) ;;
    esac
    
    # Current time + offset in milliseconds
    echo $(($(date +%s) * 1000 + seconds * 1000))
  else
    # Absolute time (e.g., "2026-02-17 09:00")
    # Convert to Unix timestamp and then to milliseconds
    local timestamp=$(date -j -f "%Y-%m-%d %H:%M" "$input" +%s 2>/dev/null)
    if [[ -z "$timestamp" ]]; then
      echo "Error: Invalid date format. Use 'YYYY-MM-DD HH:MM' or relative time like '2h'" >&2
      return 1
    fi
    echo $((timestamp * 1000))
  fi
}

# Make API request
relay_api() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  
  if [[ -n "$data" ]]; then
    curl -s -X "$method" "$RELAY_API_URL$endpoint" \
      -H "Authorization: Bearer $RELAY_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "$RELAY_API_URL$endpoint" \
      -H "Authorization: Bearer $RELAY_API_KEY"
  fi
}
