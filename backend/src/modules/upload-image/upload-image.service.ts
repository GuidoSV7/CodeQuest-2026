import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiResponse,
} from 'cloudinary'
import type { CloudinaryResponse } from './upload-image.response'

export type UploadedImage = {
  buffer: Buffer
  mimetype: string
  originalname: string
}

export type UploadImageOptions = {
  folder?: string
  maxWidth?: number
  maxHeight?: number
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number
  format?: 'auto' | 'webp' | 'jpg' | 'png'
  transformation?: unknown[]
}

/**
 * Copied from ElayBet `upload-image.service`: stream upload, reuse by public id,
 * limit/quality transforms. Avatars use `uploadThumbnailImage`.
 */
@Injectable()
export class UploadImageService {
  private readonly logger = new Logger(UploadImageService.name)
  private readonly baseFolder: string

  constructor(private readonly configService: ConfigService) {
    this.baseFolder =
      this.configService.get<string>('CLOUDINARY_BASE_FOLDER') || 'CodeQuest'
  }

  async uploadImage(
    file: UploadedImage,
    options: UploadImageOptions = {},
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const folder = options.folder || 'uploads'
    const sanitizedName = sanitizeFileName(file.originalname)
    const publicId = `${this.baseFolder}/${folder}/${sanitizedName}`

    const existingImage = await this.checkImageExists(publicId)
    if (existingImage) {
      this.logger.log(`Reusing existing image: ${publicId}`)
      return existingImage
    }

    const transformations: unknown[] = [
      {
        width: options.maxWidth || 1920,
        height: options.maxHeight || 1920,
        crop: 'limit',
        quality: options.quality || 'auto:good',
        format: options.format || 'auto',
        flags: 'progressive',
        strip_metadata: true,
      },
    ]
    if (options.transformation) {
      transformations.push(...options.transformation)
    }

    return this.uploadToCloudinary(file, publicId, { transformation: transformations })
  }

  async uploadThumbnailImage(
    file: UploadedImage,
    folder = 'thumbnails',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return this.uploadImage(file, {
      folder,
      maxWidth: 400,
      maxHeight: 400,
      quality: 'auto:eco',
      format: 'auto',
    })
  }

  private async checkImageExists(
    publicId: string,
  ): Promise<UploadApiResponse | null> {
    try {
      const result = await cloudinary.api.resource(publicId)
      return result as UploadApiResponse
    } catch (error: unknown) {
      const httpCode =
        typeof error === 'object' && error && 'http_code' in error
          ? (error as { http_code?: number }).http_code
          : undefined
      if (httpCode === 404) return null
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Error checking image existence for ${publicId}: ${message}`)
      return null
    }
  }

  private uploadToCloudinary(
    file: UploadedImage,
    publicId: string,
    options: Record<string, unknown>,
  ): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { public_id: publicId, ...options },
        (error, result) => {
          if (error) return reject(error)
          resolve(result as CloudinaryResponse)
        },
      )
      Readable.from(file.buffer).pipe(uploadStream)
    })
  }
}

export function sanitizeFileName(fileName: string): string {
  let sanitized = fileName.replace(/\.[^/.]+$/, '')
  sanitized = sanitized.replace(/\s+/g, '-')
  sanitized = sanitized.replace(/[^a-z0-9-]/gi, '')
  sanitized = sanitized.toLowerCase().substring(0, 100)
  if (!sanitized.trim()) {
    const hash = createHash('md5').update(fileName).digest('hex')
    sanitized = `image-${hash.substring(0, 8)}`
  }
  return sanitized
}
