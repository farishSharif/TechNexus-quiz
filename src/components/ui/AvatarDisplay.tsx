
import { useMemo } from 'react';
import { CHARACTER_IMAGES } from '@/types/quiz';

interface AvatarDisplayProps {
    seed: string;
    imageUrl?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function AvatarDisplay({ seed, imageUrl, className = "", size = 'md' }: AvatarDisplayProps) {
    const isEmoji = useMemo(() => {
        // Basic check if the string is just an emoji (short length)
        return seed && seed.length <= 4 && /\p{Emoji}/u.test(seed);
    }, [seed]);

    const sizeClasses = {
        sm: "w-8 h-8 text-lg",
        md: "w-12 h-12 text-2xl",
        lg: "w-16 h-16 text-3xl",
        xl: "w-24 h-24 text-5xl",
        '2xl': "w-32 h-32 text-7xl",
    };

    if (isEmoji) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 rounded-full ${sizeClasses[size]} ${className}`}>
                {seed}
            </div>
        );
    }

    // Use provided image URL, or check shared character mapping, or fall back to DiceBear Lorelei
    const finalImageUrl = imageUrl || CHARACTER_IMAGES[seed] || `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc,ffadad,ffd6a5,fdffb6,caffbf,9bf6ff,a0c4ff,bdb2ff,ffc6ff`;

    return (
        <div className={`overflow-hidden rounded-full bg-white border-2 border-black/5 ${sizeClasses[size].split(' ')[0]} ${sizeClasses[size].split(' ')[1]} ${className}`}>
            <img
                src={finalImageUrl}
                alt={seed}
                className="w-full h-full object-cover"
                loading="lazy"
            />
        </div>
    );
}
