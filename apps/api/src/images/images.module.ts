import { Global, Module, type DynamicModule } from '@nestjs/common';
import { loadEnv, type ImageStorageEnv } from '../config/env.js';
import { DevImagesController } from './dev-images.controller.js';
import { IMAGE_STORAGE, type ImageStorage } from './storage/image-storage.js';
import { LocalImageStorage } from './storage/local-image-storage.js';
import { R2ImageStorage } from './storage/r2-image-storage.js';

export function createImageStorage(config: ImageStorageEnv): ImageStorage {
  return config.kind === 'r2'
    ? new R2ImageStorage(config)
    : new LocalImageStorage(config.directory, config.publicUrl);
}

/**
 * Provides the one `ImageStorage` the rest of the API injects.
 *
 * Global, because both `AuthModule` (logos) and `MenusModule` (dish photos)
 * need it and neither owns it.
 *
 * `forRoot` rather than a plain `@Module`, because which controllers exist
 * depends on the environment: the local-disk development route must not be
 * mounted in a deployment that serves images from a bucket. A route that exists
 * only when it is the right answer cannot be reached by accident.
 */
@Global()
@Module({})
export class ImagesModule {
  static forRoot(config: ImageStorageEnv = loadEnv().imageStorage): DynamicModule {
    return {
      module: ImagesModule,
      controllers: config.kind === 'local' ? [DevImagesController] : [],
      providers: [{ provide: IMAGE_STORAGE, useValue: createImageStorage(config) }],
      exports: [IMAGE_STORAGE],
    };
  }
}
