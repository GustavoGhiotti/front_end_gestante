from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_PATH = BACKEND_DIR / "gestacare.db"


class Settings(BaseSettings):
    app_name: str = "GestaCare API"
    secret_key: str = "<SECRET>"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    ai_provider: str = "ollama"
    ai_enabled: bool = True
    ai_timeout_seconds: int = 45
    ai_chat_timeout_seconds: int = 8
    ai_summary_timeout_seconds: int = 8
    ai_summary_use_llm: bool = False
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.1:8b"
    ollama_summary_model: str = "llama3.1:8b"
    ollama_auto_start: bool = True
    ollama_binary_path: str = "ollama"
    ollama_warmup_on_startup: bool = True
    ollama_keep_alive: str = "30m"
    ollama_num_ctx: int = 1024
    ollama_num_thread: int = 6
    ai_raw_sources_dir: str = str(Path.home() / "OneDrive" / "Documentos" / "BaseIA")
    ai_knowledge_dir: str = str(BACKEND_DIR / "app" / "ai" / "knowledge")
    notifications_enabled: bool = True
    web_push_subject: str = "mailto:gestacare@example.com"
    vapid_private_key_path: str = str(BACKEND_DIR / ".vapid" / "private_key.pem")
    vapid_public_key_path: str = str(BACKEND_DIR / ".vapid" / "public_key.txt")
    medication_reminder_poll_seconds: int = 30
    cors_origin_regex: str = (
        r"https?://("
        r"localhost|127\.0\.0\.1|0\.0\.0\.0|"
        r"10(?:\.\d{1,3}){3}|"
        r"192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}"
        r")(?::\d+)?"
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
