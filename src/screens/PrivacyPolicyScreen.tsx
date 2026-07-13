import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, radius, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EFFECTIVE_DATE = 'July 11, 2026';
const BUSINESS_NAME = 'Labago';
const CONTACT_EMAIL = 'labagolabago5@gmail.com';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0A0A0A', '#150202', '#0A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark" size={26} color={colors.red} />
        </View>
        <Text style={styles.heroTitle}>Privacy Policy</Text>
        <Text style={styles.heroSub}>Effective {EFFECTIVE_DATE}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          {BUSINESS_NAME} ("we", "us") operates this website and booking service. This
          policy explains what personal data we collect, why, how long we keep it, and
          the rights you have over it, in line with the EU General Data Protection
          Regulation (GDPR).
        </Text>

        <Section icon="folder-outline" title="1. Data We Collect">
          <Bullet>Name and contact details (phone number, address)</Bullet>
          <Bullet>Booking details (service, date, time, payment method)</Bullet>
          <Bullet>Customer PIN used to access and manage your bookings</Bullet>
          <Bullet>Reviews you choose to submit</Bullet>
        </Section>

        <Section icon="help-circle-outline" title="2. Why We Collect It">
          <Bullet>To create, manage, and fulfill your bookings</Bullet>
          <Bullet>To contact you about your appointment</Bullet>
          <Bullet>To let you view or manage past orders using your PIN</Bullet>
          <Bullet>To display reviews you choose to publish</Bullet>
        </Section>

        <Section icon="time-outline" title="3. How Long We Keep It">
          <Text style={styles.paragraph}>
            We retain booking data, including your name, contact details, and PIN, for{' '}
            <Text style={styles.bold}>12 months</Text> after your last booking, after
            which it is deleted. Reviews may be kept longer, since they are not
            directly linked to your contact details. You can request earlier deletion
            at any time (see Section 5).
          </Text>
        </Section>

        <Section icon="server-outline" title="4. Where Your Data Is Stored">
          <Text style={styles.paragraph}>
            Your data is stored using Google Firebase (Firestore), a third-party
            service that acts as our data processor. We do not control which servers
            or countries Firebase uses to store data. For details on how Google
            handles international data transfers, see Google's own privacy and data
            processing terms.
          </Text>
        </Section>

        <Section icon="person-circle-outline" title="5. Your Rights">
          <Bullet>Request a copy of the data we hold about you</Bullet>
          <Bullet>Request correction of inaccurate data</Bullet>
          <Bullet>Delete your data at any time</Bullet>
          <Bullet>Object to or restrict how we use your data</Bullet>
        </Section>

        <Section icon="trash-outline" title="6. Deleting Your Data">
          <Text style={styles.paragraph}>
            You can delete your own booking history and PIN code at any time from{' '}
            <Text style={styles.bold}>Order Details</Text> in the app — look up your
            bookings with your phone number and PIN, then use the{' '}
            <Text style={styles.bold}>"Delete my data"</Text> option at the bottom of
            the page. This permanently removes your bookings and PIN from our systems
            and cannot be undone. If you'd rather we handle it for you, contact us
            below.
          </Text>
        </Section>

        <LinearGradient
          colors={[colors.red, '#7a000e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.contactCard}
        >
          <Ionicons name="mail" size={20} color="#fff" />
          <Text style={styles.contactTitle}>Contact Us</Text>
          <Text style={styles.contactSub}>
            For any other privacy request or question, reach out to
          </Text>
          <Text style={styles.contactEmail}>{CONTACT_EMAIL}</Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <Ionicons name={icon} size={16} color={colors.red} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.paragraph}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F2' },

  hero: {
    paddingTop: 56,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(232,0,28,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(232,0,28,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },

  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  intro: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.gray600,
    marginBottom: spacing.lg,
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(232,0,28,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.black },

  paragraph: { fontSize: 13, lineHeight: 20, color: colors.gray800, flex: 1 },
  bold: { fontWeight: '700', color: colors.black },

  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 8, paddingRight: 4 },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.red,
    marginTop: 7,
  },

  contactCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },
  contactTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 4 },
  contactSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  contactEmail: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },
});
