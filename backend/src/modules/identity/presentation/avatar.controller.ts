import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { CurrentUserId } from './current-user.decorator'
import { SessionAuthGuard } from './session-auth.guard'
import { AUTH_SERVICE } from '../identity.tokens'
import type { AuthService } from '../application/auth.service'
import { UploadImageService, type UploadedImage } from '../../upload-image/upload-image.service'
import { secureUrlFromUpload } from '../../upload-image/secure-url-from-upload'

@Controller('me')
@UseGuards(SessionAuthGuard)
export class AvatarController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly auth: AuthService,
    private readonly uploads: UploadImageService,
  ) {}

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2_000_000 } }),
  )
  async upload(
    @CurrentUserId() userId: string,
    @UploadedFile() file?: UploadedImage,
  ) {
    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY) {
      throw new ServiceUnavailableException('Image upload is not configured')
    }
    if (!file?.buffer || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('An image file is required')
    }

    const uploaded = await this.uploads.uploadThumbnailImage(file, 'avatars')
    const avatarUrl = secureUrlFromUpload(
      uploaded as { secure_url?: string },
    )
    const user = await this.auth.updateAvatar(userId, avatarUrl)
    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
    }
  }
}
