import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import get_current_user
from ..config import settings
from ..models import User
from ..schemas import UploadResponse

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=400,
            detail=f"Format tidak didukung. Gunakan: {', '.join(settings.allowed_extensions_list)}",
        )

    contents = await file.read()
    if len(contents) > settings.max_upload_size:
        raise HTTPException(status_code=400, detail="Ukuran file melebihi 5MB")

    os.makedirs(settings.upload_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    dest = os.path.join(settings.upload_dir, stored_name)
    with open(dest, "wb") as f:
        f.write(contents)

    return UploadResponse(path=stored_name, filename=file.filename or stored_name)
