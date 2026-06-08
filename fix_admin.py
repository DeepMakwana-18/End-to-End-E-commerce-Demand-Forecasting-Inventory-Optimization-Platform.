import asyncio
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine(
        'postgresql+asyncpg://postgres:postgres@df-postgres:5432/demandforecaster'
    )
    pw_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE users SET password_hash=:h WHERE email='admin@titan.demo'"),
            {"h": pw_hash}
        )
        result = await conn.execute(text("SELECT email, LEFT(password_hash,10) FROM users"))
        for row in result:
            print(row)
    print("Done — admin password set to admin123")

asyncio.run(main())
