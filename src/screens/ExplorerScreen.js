import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Share,
    Alert,
    Dimensions,
    TextInput,
    Modal,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
    ChevronRight,
    ArrowLeft,
    Search,
    MoreVertical,
    HardDrive,
    LayoutGrid,
    List as ListIcon,
    Plus,
    Image as ImageIcon,
    Video,
    Music,
    Download,
    Trash2,
    PieChart,
    Package, // Changed from AppWindow
    File,
    Folder,
    X,
    Check,
    Edit2,
    Info,
    RefreshCw,
    Eye,
    EyeOff,
    Copy,
    Clipboard,
    Scissors,
    Share2,
    ArrowDownAZ,
    ArrowUpAZ,
    Calendar,
    maximize,
    FileText
} from 'lucide-react-native';
import { theme } from '../theme/theme';
import { getFileIcon, formatSize } from '../utils/fileHelpers';

const { width } = Dimensions.get('window');

function getCategoryTitle(cat) {
    switch (cat) {
        case 'image': return 'Fotoğraflar';
        case 'video': return 'Videolar';
        case 'audio': return 'Ses Dosyaları';
        case 'document': return 'Belgeler';
        case 'app': return 'Uygulamalar';
        case 'download': return 'İndirilenler';
        case 'trash': return 'Geri Dönüşüm';
        default: return 'Dosyalar';
    }
}

const ExplorerScreen = ({ navigation, route = {} }) => {
    const defaultPath = FileSystem.documentDirectory;
    const params = route.params || {};

    // Route params: path (string), category (string: 'image'|'video'|'audio'|'app'|'download'|'system'), title (string)
    const currentPath = params.path || defaultPath;
    const isRoot = !params.path && !params.category;
    const category = params.category;
    const title = params.title || (isRoot ? 'Dosya Yöneticisi' : (category ? getCategoryTitle(category) : (currentPath.split('/').pop() || 'Dosyalar')));

    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showHidden, setShowHidden] = useState(params.showHidden || false);

    // Sorting & Selection
    const [sortOption, setSortOption] = useState('name-asc'); // name-asc, name-desc, date-asc, date-desc, size-asc, size-desc
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);

    // Clipboard for Move/Copy
    const [clipboard, setClipboard] = useState(null); // { file: object, action: 'move' | 'copy' }

    // Dashboard Stats
    const [stats, setStats] = useState({
        image: 0,
        video: 0,
        audio: 0,
        app: 0,
        download: 0,
        trash: 0,
        free: 0,
        total: 100 // dummy total
    });

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [renameText, setRenameText] = useState('');
    const [actionType, setActionType] = useState('menu'); // 'menu' | 'rename'

    const ensureBaseDirectories = async () => {
        if (!defaultPath) return;
        const dirs = ['Download', '.trash', 'Documents', 'Pictures', 'Music'];
        try {
            for (const dir of dirs) {
                const dirPath = defaultPath + (defaultPath.endsWith('/') ? '' : '/') + dir;
                const info = await FileSystem.getInfoAsync(dirPath);
                if (!info.exists) {
                    await FileSystem.makeDirectoryAsync(dirPath);
                }
            }
        } catch (e) {
            console.log('Base dir init error', e);
        }
    };

    // Helper: Recursive Scan for Categories
    const scanRecursively = async (dir, type) => {
        let results = [];
        try {
            const entries = await FileSystem.readDirectoryAsync(dir);
            for (const entry of entries) {
                if (entry.startsWith('.') && !showHidden && entry !== '.trash') continue;
                if (entry === '.trash' && type !== 'trash') continue;

                const fullPath = dir + (dir.endsWith('/') ? '' : '/') + entry;
                const info = await FileSystem.getInfoAsync(fullPath);

                if (info.isDirectory) {
                    const subResults = await scanRecursively(fullPath, type);
                    results = [...results, ...subResults];
                } else {
                    if (matchType(entry, type)) {
                        results.push({
                            name: entry,
                            path: fullPath,
                            isDirectory: () => false,
                            size: info.size
                        });
                    }
                }
            }
        } catch (e) {
            console.log('Scan error:', e);
        }
        return results;
    };

    const matchType = (filename, type) => {
        if (!filename || typeof filename !== 'string') return false;
        const parts = filename.split('.');
        if (parts.length < 2) return false;
        const ext = parts.pop().toLowerCase();
        if (!ext) return false;

        if (type === 'image') return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext);
        if (type === 'video') return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
        if (type === 'audio') return ['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext);
        if (type === 'document') return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md'].includes(ext);
        if (type === 'app') return ['apk', 'ipa'].includes(ext);
        return false;
    };

    const loadFiles = useCallback(async () => {
        try {
            if (!currentPath) {
                setLoading(false);
                return;
            }
            setLoading(true);
            let items = [];

            if (category) {
                if (category === 'trash') {
                    await ensureBaseDirectories();
                    const trashPath = defaultPath + '.trash/';
                    const names = await FileSystem.readDirectoryAsync(trashPath);
                    items = await Promise.all(names.map(async name => {
                        const path = trashPath + name;
                        const info = await FileSystem.getInfoAsync(path);
                        return { name, path, isDirectory: () => info.isDirectory, size: info.size };
                    }));
                } else if (category === 'download') {
                    await ensureBaseDirectories();
                    const path = defaultPath + 'Download/';
                    const info = await FileSystem.getInfoAsync(path);
                    if (!info.exists) await FileSystem.makeDirectoryAsync(path);

                    const names = await FileSystem.readDirectoryAsync(path);
                    items = await Promise.all(names.map(async name => {
                        const p = path + name;
                        const info = await FileSystem.getInfoAsync(p);
                        return { name, path: p, isDirectory: () => info.isDirectory, size: info.size };
                    }));
                } else {
                    items = await scanRecursively(defaultPath, category);
                }
            } else {
                const dirInfo = await FileSystem.getInfoAsync(currentPath);
                if (!dirInfo.exists) {
                    Alert.alert('Hata', 'Dizin bulunamadı: ' + currentPath);
                    setLoading(false);
                    return;
                }

                // If root, ensure base dirs exist
                if (currentPath === defaultPath || currentPath === defaultPath + '/') {
                    await ensureBaseDirectories();
                }

                const names = await FileSystem.readDirectoryAsync(currentPath);
                items = await Promise.all(names.map(async (name) => {
                    const itemPath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`;
                    const info = await FileSystem.getInfoAsync(itemPath);
                    return {
                        name,
                        path: itemPath,
                        isDirectory: () => info.isDirectory,
                        size: info.size || 0,
                    };
                }));
            }

            // Sort logic
            const sorted = items.sort((a, b) => {
                const aIsDir = a.isDirectory();
                const bIsDir = b.isDirectory();

                // Always keep folders on top
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;

                switch (sortOption) {
                    case 'name-asc': return a.name.localeCompare(b.name);
                    case 'name-desc': return b.name.localeCompare(a.name);
                    case 'size-asc': return (a.size || 0) - (b.size || 0);
                    case 'size-desc': return (b.size || 0) - (a.size || 0);
                    // Date sorting requires modification time which isn't fetched by default for all items for perf
                    // Assuming name sort as fallback for now or need to fetch mtime
                    default: return a.name.localeCompare(b.name);
                }
            });

            setFiles(sorted);
            setFilteredFiles(sorted.filter(i => showHidden || !i.name.startsWith('.') || category === 'trash'));

        } catch (error) {
            console.error('File load error:', error);
            Alert.alert('Hata', 'Dosyalar okunurken sorun oluştu: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [currentPath, category, showHidden, sortOption]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredFiles(files.filter(i => showHidden || !i.name.startsWith('.') || category === 'trash'));
        } else {
            const filtered = files.filter(file =>
                file.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredFiles(filtered);
        }
    }, [searchQuery, files, showHidden, category]);

    const onFilePress = (item) => {
        if (isSelectionMode) {
            toggleSelection(item);
            return;
        }

        if (item.isDirectory()) {
            navigation.push('Explorer', { path: item.path, title: item.name });
        } else {
            // Check if shareable
            Alert.alert(
                'Dosya İşlemi',
                `${item.name}`,
                [
                    { text: 'Aç', onPress: () => console.log('Open') }, // Placeholder for viewer
                    { text: 'Paylaş', onPress: () => shareFile(item.path) },
                    { text: 'İptal', style: 'cancel' }
                ]
            );
        }
    };

    const toggleSelection = (item) => {
        if (selectedFiles.some(f => f.path === item.path)) {
            setSelectedFiles(selectedFiles.filter(f => f.path !== item.path));
        } else {
            setSelectedFiles([...selectedFiles, item]);
        }
    };

    const shareFile = async (path) => {
        if (!(await Sharing.isAvailableAsync())) {
            Alert.alert('Hata', 'Paylaşım bu cihazda desteklenmiyor.');
            return;
        }
        await Sharing.shareAsync(path);
    };

    const openMenu = (item) => {
        if (isSelectionMode) return;
        setSelectedFile(item);
        setActionType('menu');
        setModalVisible(true);
    };

    const addToClipboard = (file, action) => {
        setClipboard({ file, action });
        setModalVisible(false);
        Alert.alert('Panoya Eklendi', `${action === 'move' ? 'Taşınacak' : 'Kopyalanacak'}: ${file.name}`);
    };

    const handlePaste = async () => {
        if (!clipboard) return;

        try {
            const destPath = currentPath + (currentPath.endsWith('/') ? '' : '/') + clipboard.file.name;

            // Check if destination is same as source
            if (destPath === clipboard.file.path) {
                Alert.alert('Uyarı', 'Hedef ve kaynak aynı olamaz.');
                return;
            }

            if (clipboard.action === 'move') {
                await FileSystem.moveAsync({
                    from: clipboard.file.path,
                    to: destPath
                });
                Alert.alert('Başarılı', 'Dosya taşındı.');
            } else {
                await FileSystem.copyAsync({
                    from: clipboard.file.path,
                    to: destPath
                });
                Alert.alert('Başarılı', 'Dosya kopyalandı.');
            }

            setClipboard(null);
            loadFiles();
        } catch (error) {
            Alert.alert('Hata', 'İşlem başarısız: ' + error.message);
        }
    };

    const handleRename = async () => {
        if (!renameText.trim()) return;
        try {
            const parentDir = selectedFile.path.substring(0, selectedFile.path.lastIndexOf('/'));
            const newPath = `${parentDir}/${renameText}`;
            await FileSystem.moveAsync({
                from: selectedFile.path,
                to: newPath
            });
            setModalVisible(false);
            loadFiles(); // Refresh
        } catch (error) {
            Alert.alert('Hata', 'Yeniden adlandırma başarısız: ' + error.message);
        }
    };

    const performDelete = async () => {
        try {
            await FileSystem.deleteAsync(selectedFile.path, { idempotent: true });
            setModalVisible(false);
            loadFiles(); // Refresh
        } catch (error) {
            Alert.alert('Hata', 'Silme işlemi başarısız: ' + error.message);
        }
    };

    const confirmDelete = () => {
        Alert.alert(
            'Sil',
            `"${selectedFile.name}" adlı öğeyi silmek istiyor musunuz?`,
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: performDelete }
            ]
        );
    };

    const navigateToCategory = (cat) => {
        navigation.push('Explorer', { category: cat });
    };

    // --- Components ---

    // --- Components ---

    const renderDashboard = () => (
        <ScrollView style={styles.dashboardContainer} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Storage Card - Interactive */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.push('Explorer', { path: defaultPath, title: 'Dahili Depolama', showHidden: true })}
            >
                <View style={styles.storageCard}>
                    <View style={styles.storageHeader}>
                        <View style={styles.storageIconBg}>
                            <HardDrive size={24} color="white" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.storageTitle}>Dahili Depolama</Text>
                            <Text style={styles.storageSubtitle}>Boş alanı kontrol et</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.percentText}>65%</Text>
                        </View>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '65%' }]} />
                    </View>
                    <TouchableOpacity style={styles.analyzeButton} onPress={() => Alert.alert('Analiz', 'Bellek analizi detayı burada olacak.')}>
                        <Text style={styles.analyzeText}>Bellek Analizi</Text>
                        <ChevronRight size={16} color="white" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {/* Categories Grid */}
            <Text style={styles.sectionTitle}>Kategoriler</Text>
            <View style={styles.gridContainer}>
                <CategoryCard
                    title="İndirilenler"
                    icon={Download}
                    color="#3b82f6"
                    onPress={() => navigateToCategory('download')}
                />
                <CategoryCard
                    title="Fotoğraflar"
                    icon={ImageIcon}
                    color="#ec4899"
                    onPress={() => navigateToCategory('image')}
                />
                <CategoryCard
                    title="Videolar"
                    icon={Video}
                    color="#8b5cf6"
                    onPress={() => navigateToCategory('video')}
                />
                <CategoryCard
                    title="Ses"
                    icon={Music}
                    color="#10b981"
                    onPress={() => navigateToCategory('audio')}
                />
                <CategoryCard
                    title="Belgeler"
                    icon={FileText}
                    color="#6366f1"
                    onPress={() => navigateToCategory('document')}
                />
                <CategoryCard
                    title="Uygulamalar"
                    icon={Package}
                    color="#f59e0b"
                    onPress={() => navigateToCategory('app')}
                />
                <CategoryCard
                    title="Geri Dönüşüm"
                    icon={Trash2}
                    color="#ef4444"
                    onPress={() => navigateToCategory('trash')}
                />
            </View>


        </ScrollView>
    );

    const renderFileItem = ({ item }) => {
        const { Icon, color } = getFileIcon(item.name, item.isDirectory());
        const isSelected = selectedFiles.some(f => f.path === item.path);

        if (viewMode === 'grid') {
            return (
                <TouchableOpacity
                    style={[styles.gridItem, isSelected && { backgroundColor: '#e0e7ff', borderRadius: 8 }]}
                    onPress={() => onFilePress(item)}
                    onLongPress={() => { setIsSelectionMode(true); toggleSelection(item); }}
                >
                    <View style={[styles.gridIconContainer, { backgroundColor: color + '15' }]}>
                        <Icon size={32} color={color} />
                        {isSelectionMode && isSelected && (
                            <View style={styles.checkBadge}>
                                <Check size={12} color="white" />
                            </View>
                        )}
                    </View>
                    <Text numberOfLines={2} style={styles.gridText}>{item.name}</Text>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={[styles.listItem, isSelected && { backgroundColor: '#e0e7ff' }]}
                onPress={() => onFilePress(item)}
                onLongPress={() => { setIsSelectionMode(true); toggleSelection(item); }}
            >
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Icon size={24} color={color} />
                    {isSelectionMode && isSelected && (
                        <View style={styles.checkBadge}>
                            <Check size={12} color="white" />
                        </View>
                    )}
                </View>
                <View style={styles.itemInfo}>
                    <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                        {item.isDirectory() ? 'Klasör' : formatSize(item.size)}
                    </Text>
                </View>
                {!isSelectionMode && (
                    <TouchableOpacity onPress={() => openMenu(item)} style={{ padding: 8 }}>
                        <MoreVertical size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            {/* Header */}
            <View style={styles.header}>
                {isSelectionMode ? (
                    <View style={[styles.headerLeft, { flex: 1 }]}>
                        <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedFiles([]); }} style={styles.backButton}>
                            <X color={theme.colors.text} size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{selectedFiles.length} Seçildi</Text>
                    </View>
                ) : (
                    <View style={[styles.headerLeft, isSearching && { flex: 1 }]}>
                        {(!isRoot || isSearching) && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (isSearching) {
                                        setIsSearching(false);
                                        setSearchQuery('');
                                    } else {
                                        navigation.goBack();
                                    }
                                }}
                                style={styles.backButton}
                            >
                                <ArrowLeft color={theme.colors.text} size={24} />
                            </TouchableOpacity>
                        )}
                        {!isSearching ? (
                            <Text style={styles.headerTitle}>{title}</Text>
                        ) : (
                            <View style={styles.searchInputContainer}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Dosya ara..."
                                    autoFocus
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
                            </View>
                        )}
                    </View>
                )}

                {!isSearching && !isSelectionMode && (
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerIcon} onPress={() => setIsSearching(true)}>
                            <Search color={theme.colors.text} size={22} />
                        </TouchableOpacity>

                        {/* Sort Button */}
                        <TouchableOpacity
                            style={styles.headerIcon}
                            onPress={() => {
                                const nextSort = sortOption === 'name-asc' ? 'name-desc' : 'name-asc'; // Simple toggle for now
                                setSortOption(nextSort);
                                Alert.alert('Sıralama', nextSort === 'name-asc' ? 'İsim (A-Z)' : 'İsim (Z-A)');
                            }}
                        >
                            {sortOption === 'name-asc' ? <ArrowDownAZ size={22} color={theme.colors.text} /> : <ArrowUpAZ size={22} color={theme.colors.text} />}
                        </TouchableOpacity>

                        {(!isRoot || category) && (
                            <TouchableOpacity
                                style={styles.headerIcon}
                                onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                            >
                                {viewMode === 'list' ? <LayoutGrid size={22} color={theme.colors.text} /> : <ListIcon size={22} color={theme.colors.text} />}
                            </TouchableOpacity>
                        )}

                        {/* Multi Select Toggle */}
                        <TouchableOpacity
                            style={styles.headerIcon}
                            onPress={() => setIsSelectionMode(true)}
                        >
                            <Check size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                )}

                {isSelectionMode && (
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerIcon} onPress={() => { setSelectedFiles(filteredFiles); }}>
                            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Tümü</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Content */}
            {isRoot && !isSearching ? (
                renderDashboard()
            ) : (
                <FlatList
                    data={filteredFiles}
                    renderItem={renderFileItem}
                    keyExtractor={item => item.path}
                    key={viewMode}
                    numColumns={viewMode === 'grid' ? 3 : 1}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyContainer}>
                                {loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : (
                                    <Text style={styles.emptyText}>
                                        {searchQuery ? 'Sonuç bulunamadı' : 'Dosya yok'}
                                    </Text>
                                )}
                            </View>
                        )
                    }
                />
            )}



            {/* Paste Action FAB */}
            {clipboard && !isRoot && !isSelectionMode && (
                <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.secondary || '#10b981' }]} onPress={handlePaste}>
                    <Clipboard color="white" size={28} />
                </TouchableOpacity>
            )}

            {/* Selection Toolbar */}
            {isSelectionMode && selectedFiles.length > 0 && (
                <View style={styles.selectionToolbar}>
                    <TouchableOpacity style={styles.toolbarAction} onPress={() => {
                        Alert.alert('Sil', `${selectedFiles.length} dosyayı silmek istiyor musunuz?`, [
                            { text: 'İptal', style: 'cancel' },
                            {
                                text: 'Sil', style: 'destructive', onPress: async () => {
                                    for (let f of selectedFiles) {
                                        try { await FileSystem.deleteAsync(f.path, { idempotent: true }); } catch (e) { }
                                    }
                                    setIsSelectionMode(false);
                                    setSelectedFiles([]);
                                    loadFiles();
                                }
                            }
                        ]);
                    }}>
                        <Trash2 color={theme.colors.error} size={24} />
                        <Text style={[styles.toolbarText, { color: theme.colors.error }]}>Sil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.toolbarAction} onPress={() => {
                        // Share logic needed here for multiple
                        Alert.alert('Özellik', 'Çoklu paylaşım yakında eklenecek.');
                    }}>
                        <Share2 color={theme.colors.text} size={24} />
                        <Text style={styles.toolbarText}>Paylaş</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Operations Modal */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {actionType === 'menu' ? (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.iconContainer, { width: 40, height: 40, marginRight: 12 }]}>
                                            <File size={24} color={theme.colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalTitle} numberOfLines={1}>
                                                {selectedFile?.name}
                                            </Text>
                                            <Text style={styles.modalSubtitle}>
                                                {selectedFile?.isDirectory() ? 'Klasör' : formatSize(selectedFile?.size)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.modalActions}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <TouchableOpacity style={[styles.actionRow, { flex: 1, marginRight: 8 }]} onPress={() => addToClipboard(selectedFile, 'copy')}>
                                            <View style={[styles.actionIcon, { backgroundColor: '#e2e8f0' }]}>
                                                <Copy size={20} color={theme.colors.text} />
                                            </View>
                                            <Text style={styles.actionText}>Kopyala</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.actionRow, { flex: 1 }]} onPress={() => addToClipboard(selectedFile, 'move')}>
                                            <View style={[styles.actionIcon, { backgroundColor: '#e2e8f0' }]}>
                                                <Scissors size={20} color={theme.colors.text} />
                                            </View>
                                            <Text style={styles.actionText}>Taşı</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity style={styles.actionRow} onPress={() => { setActionType('rename'); setRenameText(selectedFile.name); }}>
                                        <View style={[styles.actionIcon, { backgroundColor: '#f1f5f9' }]}>
                                            <Edit2 size={20} color={theme.colors.text} />
                                        </View>
                                        <Text style={styles.actionText}>Yeniden Adlandır</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionRow} onPress={confirmDelete}>
                                        <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                                            <Trash2 size={20} color={theme.colors.error} />
                                        </View>
                                        <Text style={[styles.actionText, { color: theme.colors.error }]}>
                                            {category === 'trash' ? 'Kalıcı Olarak Sil' : 'Sil'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionRow} onPress={() => { setModalVisible(false); Alert.alert('Bilgi', `Yol: ${selectedFile.path}`); }}>
                                        <View style={[styles.actionIcon, { backgroundColor: '#f1f5f9' }]}>
                                            <Info size={20} color={theme.colors.text} />
                                        </View>
                                        <Text style={styles.actionText}>Bilgi</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            // Rename View
                            <View style={styles.renameContainer}>
                                <Text style={styles.renameTitle}>Yeniden Adlandır</Text>
                                <TextInput
                                    style={styles.renameInput}
                                    value={renameText}
                                    onChangeText={setRenameText}
                                    autoFocus
                                    selectTextOnFocus
                                />
                                <View style={styles.renameButtons}>
                                    <TouchableOpacity
                                        style={[styles.renameButton, styles.cancelButton]}
                                        onPress={() => setActionType('menu')}
                                    >
                                        <Text style={styles.cancelButtonText}>İptal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.renameButton, styles.saveButton]}
                                        onPress={handleRename}
                                    >
                                        <Text style={styles.saveButtonText}>Kaydet</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

// Moved outside
const CategoryCard = ({ title, icon: Icon, color, onPress }) => (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
        <View style={[styles.categoryIcon, { backgroundColor: color + '20' }]}>
            <Icon size={28} color={color} />
        </View>
        <Text style={styles.categoryTitle}>{title}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8fafc',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    headerRight: {
        flexDirection: 'row',
    },
    headerIcon: {
        padding: 8,
        marginLeft: 4,
    },
    dashboardContainer: {
        flex: 1,
        padding: 16,
    },
    storageCard: {
        backgroundColor: '#6366f1',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        elevation: 5,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    storageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    storageIconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    storageTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    storageSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    percentText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 4,
    },
    analyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 12,
    },
    analyzeText: {
        color: 'white',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    categoryCard: {
        width: (width - 48) / 2, // 2 column
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    categoryIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    seeAll: {
        color: '#6366f1',
        fontWeight: '600',
    },
    // List Styles
    listContent: {
        paddingBottom: 100,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        backgroundColor: '#f1f5f9',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1e293b',
        marginBottom: 4,
    },
    itemMeta: {
        fontSize: 13,
        color: '#64748b',
    },
    gridItem: {
        width: width / 3,
        alignItems: 'center',
        padding: 8,
        marginBottom: 16,
    },
    gridIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    gridText: {
        fontSize: 13,
        textAlign: 'center',
        color: '#1e293b',
        paddingHorizontal: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
    },
    searchInputContainer: {
        flex: 1,
        marginRight: 8,
    },
    searchInput: {
        fontSize: 16,
        color: '#1e293b',
        padding: 0,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    checkBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#3b82f6',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white'
    },
    selectionToolbar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 24,
        justifyContent: 'space-around'
    },
    toolbarAction: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    toolbarText: {
        fontSize: 12,
        marginTop: 4,
        color: '#334155',
        fontWeight: '500'
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 250,
        paddingBottom: 40,
    },
    modalHeader: {
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748b',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
        marginLeft: 16,
    },
    // Rename
    renameContainer: {
        paddingBottom: 20,
    },
    renameTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        color: '#1e293b',
    },
    renameInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        color: '#1e293b',
    },
    renameButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    renameButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 12,
    },
    cancelButton: {
        backgroundColor: '#f1f5f9',
    },
    saveButton: {
        backgroundColor: '#6366f1',
    },
    cancelButtonText: {
        color: '#64748b',
        fontWeight: '600',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});

export default ExplorerScreen;
