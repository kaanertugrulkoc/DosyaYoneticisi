import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Image,
    Dimensions,
    Alert,
    Modal,
    ActivityIndicator
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import {
    Folder,
    Image as ImageIconLucide,
    Trash2,
    RotateCw,
    Crop,
    ArrowLeft,
    MoreVertical,
    Grid3x3,
    List as ListIcon
} from 'lucide-react-native';
import { theme } from '../theme/theme';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 32) / COLUMN_COUNT;

const GalleryScreen = ({ navigation }) => {
    const [albums, setAlbums] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('albums'); // 'albums' | 'photos'
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status === 'granted') {
            loadAlbums();
        } else {
            Alert.alert('İzin Gerekli', 'Galeriye erişim için izin vermeniz gerekiyor.');
        }
    };

    const loadAlbums = async () => {
        try {
            setLoading(true);
            const albumsData = await MediaLibrary.getAlbumsAsync();

            // Get photo count for each album
            const albumsWithCount = await Promise.all(
                albumsData.map(async (album) => {
                    const assets = await MediaLibrary.getAssetsAsync({
                        album: album.id,
                        mediaType: 'photo',
                        first: 1
                    });
                    return {
                        ...album,
                        assetCount: assets.totalCount,
                        thumbnail: assets.assets[0]?.uri || null
                    };
                })
            );

            setAlbums(albumsWithCount);
        } catch (error) {
            console.error('Album load error:', error);
            Alert.alert('Hata', 'Albümler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const loadPhotos = async (albumId) => {
        try {
            setLoading(true);
            const assets = await MediaLibrary.getAssetsAsync({
                album: albumId,
                mediaType: 'photo',
                first: 100,
                sortBy: ['creationTime']
            });
            setPhotos(assets.assets);
        } catch (error) {
            console.error('Photos load error:', error);
            Alert.alert('Hata', 'Fotoğraflar yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const openAlbum = (album) => {
        setSelectedAlbum(album);
        setViewMode('photos');
        loadPhotos(album.id);
    };

    const goBackToAlbums = () => {
        setViewMode('albums');
        setSelectedAlbum(null);
        setPhotos([]);
    };

    const openPhotoMenu = (photo) => {
        setSelectedPhoto(photo);
        setModalVisible(true);
    };

    const deletePhoto = async () => {
        try {
            await MediaLibrary.deleteAssetsAsync([selectedPhoto.id]);
            setModalVisible(false);
            Alert.alert('Başarılı', 'Fotoğraf silindi.');
            loadPhotos(selectedAlbum.id);
        } catch (error) {
            Alert.alert('Hata', 'Fotoğraf silinemedi: ' + error.message);
        }
    };

    const rotatePhoto = () => {
        Alert.alert('Özellik', 'Döndürme özelliği yakında eklenecek.');
        setModalVisible(false);
    };

    const cropPhoto = () => {
        Alert.alert('Özellik', 'Kırpma özelliği yakında eklenecek.');
        setModalVisible(false);
    };

    const renderAlbumItem = ({ item }) => (
        <TouchableOpacity
            style={styles.albumCard}
            onPress={() => openAlbum(item)}
        >
            {item.thumbnail ? (
                <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.albumThumbnail}
                />
            ) : (
                <View style={[styles.albumThumbnail, styles.placeholderThumbnail]}>
                    <Folder size={40} color="#94a3b8" />
                </View>
            )}
            <View style={styles.albumInfo}>
                <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.albumCount}>{item.assetCount} fotoğraf</Text>
            </View>
        </TouchableOpacity>
    );

    const renderPhotoItem = ({ item }) => (
        <TouchableOpacity
            style={styles.photoItem}
            onLongPress={() => openPhotoMenu(item)}
        >
            <Image
                source={{ uri: item.uri }}
                style={styles.photoImage}
            />
        </TouchableOpacity>
    );

    if (!hasPermission) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.permissionContainer}>
                    <ImageIconLucide size={64} color="#94a3b8" />
                    <Text style={styles.permissionText}>Galeriye erişim izni gerekli</Text>
                    <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={requestPermissions}
                    >
                        <Text style={styles.permissionButtonText}>İzin Ver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {viewMode === 'photos' && (
                        <TouchableOpacity onPress={goBackToAlbums} style={styles.backButton}>
                            <ArrowLeft color={theme.colors.text} size={24} />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>
                        {viewMode === 'albums' ? 'Albümler' : selectedAlbum?.title}
                    </Text>
                </View>
                {viewMode === 'photos' && (
                    <View style={styles.headerRight}>
                        <Text style={styles.photoCount}>{photos.length} fotoğraf</Text>
                    </View>
                )}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : viewMode === 'albums' ? (
                <FlatList
                    data={albums}
                    renderItem={renderAlbumItem}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.albumList}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Folder size={64} color="#94a3b8" />
                            <Text style={styles.emptyText}>Albüm bulunamadı</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={photos}
                    renderItem={renderPhotoItem}
                    keyExtractor={item => item.id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.photoList}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <ImageIconLucide size={64} color="#94a3b8" />
                            <Text style={styles.emptyText}>Fotoğraf bulunamadı</Text>
                        </View>
                    }
                />
            )}

            {/* Photo Actions Modal */}
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
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Fotoğraf İşlemleri</Text>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.actionRow} onPress={rotatePhoto}>
                                <View style={[styles.actionIcon, { backgroundColor: '#e0f2fe' }]}>
                                    <RotateCw size={20} color="#0284c7" />
                                </View>
                                <Text style={styles.actionText}>Döndür</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionRow} onPress={cropPhoto}>
                                <View style={[styles.actionIcon, { backgroundColor: '#ddd6fe' }]}>
                                    <Crop size={20} color="#7c3aed" />
                                </View>
                                <Text style={styles.actionText}>Kırp</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionRow} onPress={deletePhoto}>
                                <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                                    <Trash2 size={20} color="#dc2626" />
                                </View>
                                <Text style={[styles.actionText, { color: '#dc2626' }]}>Sil</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

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
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
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
        alignItems: 'center',
    },
    photoCount: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    permissionText: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    albumList: {
        padding: 16,
    },
    albumCard: {
        flex: 1,
        margin: 8,
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    albumThumbnail: {
        width: '100%',
        height: 150,
        backgroundColor: '#f1f5f9',
    },
    placeholderThumbnail: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    albumInfo: {
        padding: 12,
    },
    albumTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    albumCount: {
        fontSize: 14,
        color: '#64748b',
    },
    photoList: {
        padding: 4,
    },
    photoItem: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        padding: 2,
    },
    photoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 32,
    },
    modalHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    modalActions: {
        padding: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
    },
});

export default GalleryScreen;
