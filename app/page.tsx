'use client';

import { useEffect, useRef, useState } from 'react';
import Navigation from '@/components/Navigation';
import PostCard, { PostData } from '@/components/PostCard';
import SuggestedUsers from '@/components/SuggestedUsers';
import { getCurrentUser, getSuggestedUsers } from '@/lib/userData';

export default function Home() {
  const [allPosts, setAllPosts] = useState<PostData[]>([]);
  const [visiblePostsCount, setVisiblePostsCount] = useState(4); // Mostrar 1 post + 3 precargados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const postsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const response = await fetch('/api/photos');
        if (!response.ok) {
          throw new Error('Failed to fetch photos');
        }
        const data = await response.json();
        const posts = data.posts || [];
        setAllPosts(posts);
      } catch (err) {
        console.error('Error fetching photos:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, []);

  // Observar el contenedor de posts para lazy loading
  useEffect(() => {
    if (!postsContainerRef.current || allPosts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postElement = entry.target as HTMLElement;
            const postIndex = Array.from(postsContainerRef.current!.children).indexOf(postElement);
            
            // Cuando vemos el post en index, aseguramos tener hasta index + 4 posts cargados
            const neededCount = postIndex + 4;
            if (neededCount > visiblePostsCount && neededCount <= allPosts.length) {
              setVisiblePostsCount(neededCount);
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: '100px' }
    );

    // Observar todos los posts visibles
    const postElements = postsContainerRef.current.children;
    Array.from(postElements).forEach((postElement) => {
      observer.observe(postElement);
    });

    return () => observer.disconnect();
  }, [allPosts.length, visiblePostsCount]);

  const visiblePosts = allPosts.slice(0, visiblePostsCount);

  return (
    <>
      <Navigation />
      
      <main className="main-container">
        <section className="content-container">
          <div className="content">
            {/* Posts */}
            <div className="posts" ref={postsContainerRef}>
              {loading && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>Cargando fotos...</p>
                </div>
              )}
              
              {error && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
                  <p>Error: {error}</p>
                  <p style={{ fontSize: '14px', marginTop: '10px' }}>
                    Make sure to configure your .env file with OneDrive credentials
                  </p>
                </div>
              )}
              
              {!loading && !error && allPosts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>No photos found in the configured OneDrive folder</p>
                </div>
              )}
              
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>

          {/* Suggested Users Sidebar */}
          <SuggestedUsers
            users={getSuggestedUsers()}
            currentUser={getCurrentUser()}
          />
        </section>
      </main>
    </>
  );
}
