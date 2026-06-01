from pydantic import BaseModel


class PushSubscriptionKeysIn(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeysIn
    userAgent: str | None = None


class PushSubscriptionDeleteIn(BaseModel):
    endpoint: str


class PushPublicKeyOut(BaseModel):
    publicKey: str
    enabled: bool


class NotificationTestOut(BaseModel):
    delivered: bool
    detail: str
