from fastapi import APIRouter, UploadFile, File
from uuid import uuid4
from datetime import datetime

from backend.app.core.config import settings
from supabase import create_client

router = APIRouter()

supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)

@router.post("/receipts")
async def upload_receipt(file: UploadFile = File(...)):
    receipt_id = str(uuid4())

    # 1. READ FILE
    file_bytes = await file.read()

    storage_path = f"{receipt_id}_{file.filename}"

    # 2. UPLOAD TO STORAGE
    supabase.storage.from_("receipts").upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": file.content_type}
    )

    # 3. INSERT DB ROW
    result = supabase.table("receipts").insert({
        "id": receipt_id,
        "user_id": None,
        "file_name": file.filename,
        "file_type": file.content_type,
        "storage_path": storage_path,
        "raw_text": None,
        "status": "uploaded",
        "upload_time": datetime.utcnow().isoformat()
    }).execute()

    return {
        "receipt_id": receipt_id,
        "storage_path": storage_path,
        "db_result": result.data
    }

@router.get("/receipts/{receipt_id}/file")
def get_receipt_file(receipt_id: str):
    receipt = supabase.table("receipts") \
        .select("*") \
        .eq("id", receipt_id) \
        .single() \
        .execute().data

    url = supabase.storage.from_("receipts").get_public_url(
        receipt["storage_path"]
    )

    return {
        "receipt_id": receipt_id,
        "file_url": url
    }