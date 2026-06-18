import { Alert, Linking } from 'react-native';

export const PRIVACY_URL = 'https://kushaldutta.github.io/tidbit/privacy';
export const TERMS_URL = 'https://kushaldutta.github.io/tidbit/terms';

export async function openLegalUrl(url, label = 'link') {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', `Could not open ${label}.`);
    }
  } catch {
    Alert.alert('Error', `Could not open ${label}.`);
  }
}
