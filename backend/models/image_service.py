import boto3
from botocore.exceptions import ClientError
from botocore.client import BaseClient
from dotenv import load_dotenv
import os
import time
from PIL import Image
from io import BytesIO
from typing import BinaryIO


load_dotenv()


class ImageService:
    s3_client: BaseClient | None = None

    @classmethod
    def get_s3_client(cls) -> BaseClient:
        """
        回傳S3連線

        注意：需在env檔案提供"AWS_REGION"、"AWS_ACCESS_KEY_ID"、"AWS_SECRET_ACCESS_KEY"
        """
        if cls.s3_client:
            return cls.s3_client
        try:
            if os.getenv("AWS_SECRET_ACCESS_KEY"):
                cls.s3_client = boto3.client(
                    "s3",
                    region_name=os.getenv("AWS_REGION"),
                    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                )
            else:
                cls.s3_client = boto3.client("s3", region_name=os.getenv("AWS_REGION"))
                cls.s3_client.list_buckets()

            return cls.s3_client

        except ClientError as e:
            print("S3 upload error:", e)
            raise

    @classmethod
    def save_image(cls, file_name: str, image: BinaryIO) -> str | None:
        """
        上傳圖片至s3

        Args:
            file_name: 圖片名稱
            image: 轉檔成webp的圖片

        Returns:
            成功：檔案名稱
            失敗：None
        """

        s3 = cls.get_s3_client()

        if not image:
            return None

        try:
            s3.upload_fileobj(
                image,
                os.getenv("AWS_S3_BUCKET_NAME"),
                file_name,
                ExtraArgs={"ContentType": "webp"},
            )

            return file_name
        except ClientError as e:
            print("S3 upload error:", e)
            return None

    @staticmethod
    def file_url(file_name: str) -> str:
        """
        取得圖片網址

        Args:
            file_name: 圖片檔案名稱

        Returns:
            S3圖片網址

        """
        return f"https://{os.getenv('CLOUDFRONT_DOMAIN')}/{file_name}"

    @staticmethod
    def trip_image_name(trip_id: int, user_id: int) -> str:
        """
        回傳行程背景圖片名稱

        Args:
            trip_id: 行程ID
            user_id: 建立行程的用戶ID

        Returns:
            行程背景圖片檔案名稱

        """
        return f"trip/{trip_id}.webp"

    @staticmethod
    def transaction_image_name(trip_id: int, user_id: int) -> str:
        """
        回傳交易紀錄附錄圖片名稱

        Args:
            trip_id: 儲存該交易紀錄的行程ID
            user_id: 建立交易紀錄的用戶ID

        Returns:
            交易紀錄附錄圖片名稱

        """
        filename = f"{trip_id}{user_id}{int(time.time() * 1000)}.webp"
        return f"transaction/{trip_id}/{filename}"

    @staticmethod
    def avatar_image_name(user_id: int) -> str:
        """
        回傳用戶大頭貼名稱
        """
        return f"avatars/{user_id}.webp"

    @staticmethod
    def convert_to_webp(file: BinaryIO) -> BytesIO:
        """
        將圖片轉檔成webp格式
        """

        image = Image.open(file)

        buffer = BytesIO()

        image.save(buffer, format="WEBP", quality=80)

        buffer.seek(0)

        return buffer
    
    @classmethod
    def delete_image(cls, file_name: str)->bool:
        """
        刪除圖片

        Args:
            file_name: 圖片名稱

        Returns:
            成功: True
            失敗: False

        """

        s3 = cls.get_s3_client()

        try:
            s3.delete_object(
                Bucket=os.getenv("AWS_S3_BUCKET_NAME"),
                Key=file_name,
            )
            return True

        except ClientError as e:
            print(e)
            return False
