import Image from "next/image";

const sampleReviews = [
  {
    name: "Maya C.",
    rating: 5,
    avatar: "/reviewers/maya-chen.webp",
    review: "My skin feels softer and looks noticeably brighter after adding this to my routine. It layers beautifully under makeup, too.",
  },
  {
    name: "Lea S.",
    rating: 5,
    avatar: "/reviewers/lea-santos.webp",
    review: "I love how gentle and lightweight it feels, and my complexion has looked much more balanced lately.",
  },
  {
    name: "Priya S.",
    rating: 5,
    avatar: "/reviewers/priya-shah.webp",
    review: "This was easy to work into my daily routine and left my skin feeling smooth, hydrated, and refreshed.",
  },
  {
    name: "Emily T.",
    rating: 4.5,
    avatar: "/reviewers/emily-tan.webp",
    review: "The texture feels lovely and absorbs quickly without any sticky residue. I started noticing a healthier glow within a few weeks.",
  },
] as const;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="review-rating" aria-label={`${rating} out of 5 stars`} role="img">
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, rating - index));

        return (
          <span className="review-star" aria-hidden="true" key={index}>
            <span className="review-star-empty">★</span>
            <span className="review-star-fill" style={{ width: `${fill * 100}%` }}>
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function ProductReviews() {
  return (
    <section className="product-reviews" aria-labelledby="sample-reviews-heading">
      <div className="product-reviews-heading">
        <div>
          <p className="eyebrow">SHARED EXPERIENCES</p>
          <h2 id="sample-reviews-heading">Sample Customer Reviews</h2>
        </div>
        <p className="product-reviews-disclosure">Illustrative sample content</p>
      </div>

      <div className="product-review-grid">
        {sampleReviews.map((review) => (
          <article className="product-review-card" key={review.name}>
            <div className="product-review-author">
              <Image className="product-review-avatar" src={review.avatar} alt="" width={56} height={56} />
              <div>
                <h3>{review.name}</h3>
                <StarRating rating={review.rating} />
              </div>
            </div>
            <p>{review.review}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
