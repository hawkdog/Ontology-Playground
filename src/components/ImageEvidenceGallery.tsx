import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileImage, X } from 'lucide-react';
import type { QAAttachment } from '../data/projectAnalysis';

interface ImageEvidenceGalleryProps {
  images: QAAttachment[];
  label?: string;
}

function imageSource(image: QAAttachment): string | undefined {
  const source = image.url || image.path;
  if (!source) return undefined;
  if (/^(data:image\/|blob:|https?:\/\/|\/)/i.test(source)) return source;
  return undefined;
}

function imageLocation(image: QAAttachment): string | undefined {
  const location = image.path || image.url;
  return location && location !== image.label ? location : undefined;
}

export function ImageEvidenceGallery({ images, label = 'Image evidence' }: ImageEvidenceGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? undefined : images[activeIndex];
  const activePosition = activeIndex ?? 0;
  const activeSource = activeImage ? imageSource(activeImage) : undefined;
  const activeLocation = activeImage ? imageLocation(activeImage) : undefined;

  const openImage = (index: number) => setActiveIndex(index);
  const closeImage = () => setActiveIndex(null);

  const showPrevious = () => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return current === 0 ? images.length - 1 : current - 1;
    });
  };

  const showNext = () => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return current === images.length - 1 ? 0 : current + 1;
    });
  };

  useEffect(() => {
    if (activeIndex === null) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeImage();
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="analysis-image-strip" aria-label={label}>
        {images.map((image, index) => {
          const source = imageSource(image);
          const location = imageLocation(image);
          return (
            <figure key={image.id}>
              <button
                className="analysis-image-thumb"
                type="button"
                onClick={() => openImage(index)}
                aria-label={`Open image ${image.label}`}
              >
                {source ? (
                  <img src={source} alt={image.label} />
                ) : (
                  <span className="analysis-image-placeholder">
                    <FileImage size={18} />
                  </span>
                )}
              </button>
              <figcaption>{image.label}</figcaption>
              {location && <small>{location}</small>}
            </figure>
          );
        })}
      </div>

      {activeImage && (
        <div className="analysis-lightbox" role="dialog" aria-modal="true" aria-label={activeImage.label}>
          <div className="analysis-lightbox-backdrop" onClick={closeImage} />
          <div className="analysis-lightbox-panel">
            <div className="analysis-lightbox-toolbar">
              <div>
                <strong>{activeImage.label}</strong>
                {activeLocation && <span>{activeLocation}</span>}
              </div>
              <div className="analysis-lightbox-actions">
                {activeSource && (
                  <a href={activeSource} target="_blank" rel="noreferrer" aria-label={`Open ${activeImage.label} in a new tab`}>
                    <ExternalLink size={16} />
                  </a>
                )}
                <button type="button" onClick={closeImage} aria-label="Close image gallery">
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="analysis-lightbox-stage">
              {activeSource ? (
                <img src={activeSource} alt={activeImage.label} />
              ) : (
                <div className="analysis-lightbox-placeholder">
                  <FileImage size={30} />
                  <p>This image reference is saved, but the browser cannot preview the local file path directly.</p>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="analysis-lightbox-navigation">
                <button type="button" onClick={showPrevious} aria-label="Previous image">
                  <ChevronLeft size={17} />
                </button>
                <span>{activePosition + 1} of {images.length}</span>
                <button type="button" onClick={showNext} aria-label="Next image">
                  <ChevronRight size={17} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
