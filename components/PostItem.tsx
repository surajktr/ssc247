
import React from 'react';
import { BlogPost } from '../types';

interface PostItemProps {
  post: BlogPost;
  onClick: (post: BlogPost) => void;
}

const PostItem: React.FC<PostItemProps> = ({ post, onClick }) => {
  return (
    <article 
      onClick={() => onClick(post)}
      className="h-full group flex items-center p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-blue-200 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
    >
      {/* Icon/Image Placeholder */}
      <div className={`w-12 h-12 flex-shrink-0 ${post.iconBgColor} rounded-lg flex items-center justify-center mr-4 shadow-sm group-hover:scale-105 transition-transform duration-200`}>
        <span className="text-xl select-none" role="img" aria-label="Icon">
          {post.icon}
        </span>
      </div>
      
      {/* Text Content */}
      <div className="flex-grow min-w-0">
        <h3 className="text-base font-medium text-gray-800 truncate pr-2 group-hover:text-blue-700 transition-colors">
          {post.title}
        </h3>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Published • {post.date}
        </p>
      </div>
    </article>
  );
};

export default PostItem;