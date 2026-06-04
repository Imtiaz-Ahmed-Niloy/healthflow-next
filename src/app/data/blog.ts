import atrium from "@/assets/hub-atrium.jpg";
import coastal from "@/assets/hub-coastal.jpg";
import doc1 from "@/assets/doctors/doc-1.jpg";
import doc2 from "@/assets/doctors/doc-2.jpg";
import doc3 from "@/assets/doctors/doc-3.jpg";
import doc4 from "@/assets/doctors/doc-4.jpg";
import doc5 from "@/assets/doctors/doc-5.jpg";
import doc6 from "@/assets/doctors/doc-6.jpg";
import type { StaticImageData } from "next/image";

export type Post = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  cover: StaticImageData;
  author: string;
  authorPhoto: StaticImageData;
  authorRole: string;
  date: string;
  readTime: number;
  views: number;
  featured?: boolean;
  body: string[];
};

const sharedBody = [
  "We've spent the last three years quietly measuring something most hospitals take for granted: the way a room makes a body feel. The results are unambiguous — design is medicine.",
  "Across two flagship campuses, post-surgical patients in our biophilic wards reported lower pain scores, used 22% less PRN analgesia, and were discharged on average 1.7 days sooner than a matched cohort in standard rooms.",
  "The mechanism, we believe, is a combination of three inputs: filtered daylight that anchors the circadian system, planted volumes that lower measured cortisol within fifteen minutes of exposure, and acoustic engineering that drops ambient noise to under 35 decibels at night.",
  "None of this replaces the surgeon, the medication or the nurse. It is, instead, the substrate on which their work compounds. We think every hospital should be built this way — and we think the data is now strong enough to demand it.",
];

export const posts: Post[] = [
  { slug: "biophilic-recovery", title: "How Biophilic Wards Cut Recovery Time by 28%", dek: "A 3-year study across our flagship campuses links daylight, plants and natural acoustics to faster post-surgical healing.", category: "Research", cover: atrium, author: "Dr. Elena Park", authorPhoto: doc1, authorRole: "Cardiology", date: "May 2, 2026", readTime: 8, views: 12400, featured: true, body: sharedBody },
  { slug: "heart-of-cities", title: "The Quiet Epidemic: Urban Heart Disease in Under-40s", dek: "Why young professionals in dense cities are presenting with cardiac events a decade earlier — and what to do about it.", category: "Cardiology", cover: coastal, author: "Dr. Marcus Vale", authorPhoto: doc2, authorRole: "Neurology", date: "Apr 28, 2026", readTime: 6, views: 8920, body: sharedBody },
  { slug: "pediatric-screen-time", title: "Screen Time and Sleep: A Pediatrician's Honest Guide", dek: "Practical, judgement-free routines that work for real families with toddlers, tweens and teens.", category: "Pediatrics", cover: atrium, author: "Dr. Aisha Rahman", authorPhoto: doc3, authorRole: "Pediatrics", date: "Apr 24, 2026", readTime: 5, views: 15200, body: sharedBody },
  { slug: "joint-longevity", title: "Joint Longevity After 40: Strength, Mobility, Recovery", dek: "The three-pillar protocol I prescribe to weekend athletes who want to keep moving for the next 40 years.", category: "Orthopedics", cover: coastal, author: "Dr. Liam Chen", authorPhoto: doc4, authorRole: "Orthopedics", date: "Apr 19, 2026", readTime: 7, views: 6700, body: sharedBody },
  { slug: "early-detection-breakthroughs", title: "Early Detection: What Liquid Biopsy Means for Patients", dek: "A plain-language guide to the blood-test breakthroughs reshaping how we catch cancer in stage zero.", category: "Oncology", cover: atrium, author: "Dr. Noor Hassan", authorPhoto: doc5, authorRole: "Oncology", date: "Apr 14, 2026", readTime: 9, views: 11300, body: sharedBody },
  { slug: "skin-microbiome", title: "Your Skin Has a Microbiome. Here's How to Feed It.", dek: "Why the gentle, less-is-more approach is winning in modern dermatology — and the five products I actually recommend.", category: "Dermatology", cover: coastal, author: "Dr. Sofia Mendes", authorPhoto: doc6, authorRole: "Dermatology", date: "Apr 09, 2026", readTime: 4, views: 18600, body: sharedBody },
  { slug: "mindful-burnout", title: "Burnout Isn't Weakness — It's Biology", dek: "What the latest neuroscience says about chronic stress, and the recovery framework we use with high-performers.", category: "Mental Health", cover: atrium, author: "Dr. Mira Solis", authorPhoto: doc5, authorRole: "Mental Health", date: "Apr 05, 2026", readTime: 6, views: 9450, body: sharedBody },
  { slug: "lung-altitude", title: "Breathing at Altitude: A Pulmonologist in the Rockies", dek: "Field notes from treating elite climbers, weekend hikers and lifelong residents at 5,400 feet.", category: "Pulmonology", cover: coastal, author: "Dr. Priya Iyer", authorPhoto: doc3, authorRole: "Pulmonology", date: "Mar 30, 2026", readTime: 7, views: 5300, body: sharedBody },
  { slug: "robotic-surgery", title: "Robotic Surgery in 2026: What Patients Should Ask", dek: "Five honest questions to ask your surgeon before you consent to a robotic-assisted procedure.", category: "Surgery", cover: atrium, author: "Dr. Hiro Tanaka", authorPhoto: doc2, authorRole: "Surgery", date: "Mar 22, 2026", readTime: 8, views: 7800, body: sharedBody },
];

export const categories = ["All", "Research", "Cardiology", "Pediatrics", "Orthopedics", "Oncology", "Dermatology", "Mental Health", "Pulmonology", "Surgery"];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
