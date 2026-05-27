import sys
import os
from bson import ObjectId

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db

def main():
    db = get_db()
    tokens = list(db.push_tokens.find())
    print("\n--- FAMILY HOUSING HUB REGISTERED PUSH TOKENS ---")
    if not tokens:
        print("No push tokens registered yet. Please log in/register on a physical mobile device.")
        return

    print(f"Total Registered Tokens: {len(tokens)}\n")
    for idx, t in enumerate(tokens, 1):
        user_id = t.get('userId')
        user = db.users.find_one({'_id': ObjectId(user_id)}) if user_id else None
        user_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() if user else "Unknown User"
        user_email = user.get('email', 'N/A') if user else "N/A"
        
        print(f"[{idx}] User: {user_name} ({user_email})")
        print(f"    Token: {t.get('token')}")
        print(f"    Platform: {t.get('platform')}")
        print(f"    Updated At: {t.get('updatedAt')}")
        print("-" * 50)

if __name__ == '__main__':
    main()
