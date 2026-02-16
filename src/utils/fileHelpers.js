import { File, Folder, Image, Video, Music, FileText, FileQuestion } from 'lucide-react-native';
import { theme } from '../theme/theme';

export const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (name, isDirectory) => {
    if (isDirectory) return { Icon: Folder || File, color: theme.colors.folder };
    if (!name || typeof name !== 'string') return { Icon: File, color: theme.colors.textSecondary };

    const parts = name.split('.');
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext)) {
        return { Icon: Image || File, color: theme.colors.image };
    }
    if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) {
        return { Icon: Video || File, color: theme.colors.video };
    }
    if (['mp3', 'wav', 'm4a', 'flac', 'aac'].includes(ext)) {
        return { Icon: Music || File, color: theme.colors.audio };
    }
    if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'csv', 'md'].includes(ext)) {
        return { Icon: FileText || File, color: theme.colors.document };
    }

    return { Icon: File, color: theme.colors.textSecondary };
};

export const getFileExtension = (name) => {
    return name.split('.').pop().toUpperCase();
};
