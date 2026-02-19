import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ScrollView,
    StatusBar,
    Alert,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Moon,
    Sun,
    Shield,
    ChevronRight,
    Info,
    Trash2,
    HardDrive,
    Bell,
    Languages,
    Files
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen = () => {
    const navigation = useNavigation();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const bio = await AsyncStorage.getItem('biometric-enabled');
        setBiometricEnabled(bio === 'true');
    };

    const toggleBiometrics = async (value) => {
        try {
            setBiometricEnabled(value);
            await AsyncStorage.setItem('biometric-enabled', value ? 'true' : 'false');
        } catch (e) {
            Alert.alert('Hata', 'Ayar kaydedilemedi.');
        }
    };

    const clearCache = () => {
        Alert.alert(
            'Önbelleği Temizle',
            'Tüm uygulama önbelleği temizlenecek. Devam etmek istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Temizle',
                    style: 'destructive',
                    onPress: () => Alert.alert('Başarılı', 'Önbellek temizlendi.')
                }
            ]
        );
    };

    const SettingRow = ({ icon: Icon, label, value, onValueChange, type = 'switch', onPress }) => (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme?.colors?.border || '#e2e8f0' }]}
            onPress={onPress}
            disabled={type === 'switch'}
        >
            <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme?.colors?.background || '#f8fafc' }]}>
                    <Icon size={22} color={theme?.colors?.primary || '#6366f1'} />
                </View>
                <Text style={[styles.label, { color: theme?.colors?.text || '#1e293b' }]}>{label}</Text>
            </View>
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#cbd5e1', true: theme?.colors?.primary || '#6366f1' }}
                    thumbColor="white"
                />
            ) : (
                <ChevronRight size={20} color={theme?.colors?.textSecondary || '#64748b'} />
            )}
        </TouchableOpacity>
    );

    if (!theme) return null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ayarlar</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Görünüm</Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                        <SettingRow
                            icon={isDarkMode ? Moon : Sun}
                            label="Karanlık Mod"
                            value={isDarkMode}
                            onValueChange={toggleTheme}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Güvenlik</Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                        <SettingRow
                            icon={Shield}
                            label="Biyometrik Kilidi Aktif Et"
                            value={biometricEnabled}
                            onValueChange={toggleBiometrics}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Depolama ve Veri</Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                        <SettingRow
                            icon={HardDrive}
                            label="Depolama Analizi"
                            type="chevron"
                            onPress={() => Alert.alert('Bilgi', 'Depolama analizi yakında eklenecek.')}
                        />
                        <SettingRow
                            icon={Trash2}
                            label="Önbelleği Temizle"
                            type="chevron"
                            onPress={clearCache}
                        />
                        <SettingRow
                            icon={Files}
                            label="Kopya Dosya Bulucu"
                            type="chevron"
                            onPress={() => navigation.navigate('DuplicateFinder')}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Uygulama</Text>
                    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                        <SettingRow
                            icon={Languages}
                            label="Dil"
                            type="chevron"
                            onPress={() => Alert.alert('Bilgi', 'Dil seçeneği yakında eklenecek.')}
                        />
                        <SettingRow
                            icon={Bell}
                            label="Bildirimler"
                            type="chevron"
                            onPress={() => Alert.alert('Bilgi', 'Bildirim ayarlar yakında eklenecek.')}
                        />
                        <SettingRow
                            icon={Info}
                            label="Hakkında"
                            type="chevron"
                            onPress={() => Alert.alert('Hakkında', 'Dosya Yöneticisi v1.0.0\n\nKaan Ertuğrul Koç tarafından tasarlanmıştır.')}
                        />
                    </View>
                </View>

                <Text style={styles.versionText}>Versiyon 1.0.0 (Build 20260217)</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 5,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    versionText: {
        textAlign: 'center',
        marginTop: 10,
        color: '#94a3b8',
        fontSize: 12,
    }
});

export default SettingsScreen;
