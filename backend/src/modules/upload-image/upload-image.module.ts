import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UploadImageProvider } from './upload-image'
import { UploadImageService } from './upload-image.service'

@Module({
  imports: [ConfigModule],
  providers: [UploadImageService, UploadImageProvider],
  exports: [UploadImageService, UploadImageProvider],
})
export class UploadImageModule {}
