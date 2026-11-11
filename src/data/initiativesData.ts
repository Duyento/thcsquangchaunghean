export interface InitiativeItem {
  id: number;
  title: string;
  type: "Tranh vẽ cổ động" | "Podcast học đường" | "Kịch diễn đàn" | "Mô hình CLB" | "Sáng kiến số";
  author: string;
  grade: string;
  unit: string;
  description: string;
  impact: string;
  highlights: string[];
  imagePlaceholder?: string;
}

export interface InfographicItem {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  points: { title: string; content: string; icon: string }[];
  summaryNote: string;
  badgeColor: string;
}

export interface MediaVideoItem {
  id: string;
  title: string;
  duration: string;
  theme: string;
  presenter: string;
  description: string;
  keyTakeaways: string[];
  transcriptExcerpt: string;
}

export interface QuoteItem {
  quote: string;
  author: string;
  title: string;
}

export const STUDENT_INITIATIVES: InitiativeItem[] = [
  {
    id: 1,
    title: "Bộ tranh cổ động số: 'Khát vọng bay cao không ranh giới'",
    type: "Tranh vẽ cổ động",
    author: "Nguyễn Lê Bảo An & Lê Nhật Minh",
    grade: "Chi đội 8B",
    unit: "Trường THCS Quảng Châu",
    description: "Tập hợp 12 bức vẽ đồ họa số phản ánh ước mơ nghề nghiệp phi truyền thống của học sinh: nữ kỹ sư hàng không vũ trụ, nam biên đạo múa dân gian, nữ chiến sĩ cứu hỏa dũng cảm.",
    impact: "Được trưng bày tại sảnh truyền thống nhà trường và chia sẻ trên Fanpage Liên đội thu hút hơn 2.500 lượt tương tác tích cực.",
    highlights: ["Sử dụng phần mềm đồ họa mở", "Thông điệp ngắn gọn, dễ nhớ", "Tạo cảm hứng tự tin cho học sinh khối 6, 7"]
  },
  {
    id: 2,
    title: "Chuỗi Podcast: 'Tiếng nói tuổi 14 - Khi con trai lắng nghe'",
    type: "Podcast học đường",
    author: "CLB Phát thanh Măng Non",
    grade: "Khối 9",
    unit: "Trường THCS Quảng Châu",
    description: "Chương trình phát thanh giờ ra chơi phát sóng mỗi thứ Tư hàng tuần, nơi các bạn nam sinh và nữ sinh cùng trò chuyện thẳng thắn về áp lực định kiến, chia sẻ việc nhà và tình bạn trong sáng.",
    impact: "Phát thanh trực tiếp 15 phút mỗi tuần tại sân trường và phát lại trên hệ thống bảng tin số của trường.",
    highlights: ["Gần gũi với lứa tuổi THCS", "Khách mời là các bạn học sinh tiêu biểu", "Hòm thư góp ý 'Điều em muốn nói' ẩn danh"]
  },
  {
    id: 3,
    title: "Vở kịch diễn đàn tương tác: 'Bữa cơm chiều của mẹ'",
    type: "Kịch diễn đàn",
    author: "Đội Tuyên truyền Măng Non",
    grade: "Chi đội 7A & 8C",
    unit: "Trường THCS Quảng Châu",
    description: "Vở kịch tái hiện cảnh sinh hoạt quen thuộc trong một gia đình nông thôn khi mẹ và con gái tất bật lo cơm nước trong khi bố và con trai thảnh thơi xem tivi. Khán giả học sinh được mời trực tiếp lên sân khấu thay thế nhân vật để xử lý tình huống theo hướng bình đẳng.",
    impact: "Giải Nhất Hội thi Tuyên truyền kỹ năng sống và phòng chống bạo lực giới cấp huyện.",
    highlights: ["Phương pháp kịch diễn đàn tương tác", "Tác động trực tiếp vào hành vi", "100% học sinh tham gia bình luận sôi nổi"]
  },
  {
    id: 4,
    title: "Mô hình: 'CLB Thủ lĩnh của sự thay đổi' (Change Makers)",
    type: "Mô hình CLB",
    author: "Ban Chỉ huy Liên đội",
    grade: "Khối 6, 7, 8, 9",
    unit: "Trường THCS Quảng Châu",
    description: "Mô hình sinh hoạt nòng cốt gồm 30 học sinh nam và nữ đại diện các lớp, thường xuyên tổ chức các buổi thảo luận, tập huấn kỹ năng tự bảo vệ bản thân, phòng chống bắt nạt học đường và lan tỏa lối sống bình đẳng.",
    impact: "Nhận bằng khen của Huyện đoàn vì sáng kiến xây dựng môi trường học đường an toàn, thân thiện.",
    highlights: ["Tỷ lệ nam - nữ tham gia 50:50", "Tự quản và sáng tạo nội dung", "Cầu nối giữa học sinh và thầy cô tư vấn tâm lý"]
  }
];

export const INFOGRAPHICS_DATA: InfographicItem[] = [
  {
    id: 1,
    title: "Infographic 1: Phân biệt Giới và Giới tính trong 3 phút",
    subtitle: "Nền tảng khoa học căn bản để xóa bỏ mọi định kiến sai lệch",
    category: "Kiến thức cốt lõi",
    readTime: "3 phút",
    badgeColor: "bg-blue-100 text-blue-800",
    points: [
      {
        title: "Giới tính (Sex) - Bẩm sinh tự nhiên",
        content: "Do nhiễm sắc thể và hormone quyết định (nam có NST XY, nữ có NST XX). Đặc điểm này giống nhau ở Việt Nam, Nhật Bản, Anh, Mỹ và không thay đổi theo thời đại.",
        icon: "Dna"
      },
      {
        title: "Giới (Gender) - Xã hội định hình",
        content: "Quan niệm xã hội về cách nam hay nữ nên ăn mặc, ứng xử, làm nghề gì. Điều này hoàn toàn có thể học hỏi, sửa đổi để bình đẳng và nhân văn hơn.",
        icon: "Users"
      },
      {
        title: "Bình đẳng không phải là 'Cào bằng'",
        content: "Bình đẳng giới là trao cơ hội ngang nhau để mọi cá nhân phát huy năng lực thực sự, không bắt buộc phụ nữ phải mang vác nặng như nam giới hay phủ nhận đặc điểm thể chất.",
        icon: "Scale"
      }
    ],
    summaryNote: "Hiểu đúng để không phán xét: Giới tính sinh học là tự nhiên, định kiến giới là do con người tạo ra và con người hoàn toàn có thể xóa bỏ!"
  },
  {
    id: 2,
    title: "Infographic 2: Xóa bỏ 5 Định kiến giới phổ biến ở học sinh THCS",
    subtitle: "Nhận diện những câu nói 'tưởng như vô hại' nhưng gây tổn thương sâu sắc",
    category: "Thực tế học đường",
    readTime: "4 phút",
    badgeColor: "bg-teal-100 text-teal-800",
    points: [
      {
        title: "Định kiến 1: 'Con trai không được khóc'",
        content: "Sự thật: Khóc là cơ chế giải tỏa ức chế tâm lý lành mạnh. Biết khóc và biết chia sẻ là dũng cảm, kìm nén lâu ngày dẫn đến trầm cảm.",
        icon: "Heart"
      },
      {
        title: "Định kiến 2: 'Con gái học tự nhiên kém hơn con trai'",
        content: "Sự thật: Hàng triệu nữ sinh đạt giải toán học, lập trình thế giới. Trí thông minh phụ thuộc vào sự rèn luyện kiên trì, không quy định bởi giới tính.",
        icon: "Brain"
      },
      {
        title: "Định kiến 3: 'Việc nhà là bổn phận của mẹ và con gái'",
        content: "Sự thật: Nấu ăn, giặt đồ, dọn dẹp là kỹ năng sinh tồn tự lập của mọi con người văn minh trong xã hội hiện đại.",
        icon: "Home"
      },
      {
        title: "Định kiến 4: 'Màu hồng là của con gái, con trai mặc áo hồng là ẻo lả'",
        content: "Sự thật: Màu sắc là bước sóng ánh sáng, không có giới tính. Mọi người đều có quyền tự do yêu thích màu sắc mang lại niềm vui cho mình.",
        icon: "Palette"
      },
      {
        title: "Định kiến 5: 'Trêu chọc ngoại hình bạn gái chỉ là đùa vui'",
        content: "Sự thật: Đây là hành vi bạo lực trên cơ sở giới. Trò đùa chỉ có giá trị khi tất cả mọi người cùng thoải mái và tôn trọng nhau.",
        icon: "ShieldAlert"
      }
    ],
    summaryNote: "Mỗi lời nói có sức mạnh xây dựng hoặc phá hủy. Hãy chọn những lời nói tôn trọng và khích lệ bạn bè!"
  },
  {
    id: 3,
    title: "Infographic 3: Cẩm nang 4 bước ứng phó khi gặp bạo lực học đường",
    subtitle: "Bảo vệ bản thân và bạn bè - An toàn học đường là ưu tiên hàng đầu",
    category: "Kỹ năng an toàn",
    readTime: "3 phút",
    badgeColor: "bg-amber-100 text-amber-800",
    points: [
      {
        title: "Bước 1: Nói 'KHÔNG' dứt khoát và rõ ràng",
        content: "Nhìn thẳng vào người có hành vi quấy rối hoặc trêu chọc quá trớn, nói to và nghiêm túc: 'Tôi yêu cầu bạn dừng ngay hành vi này lại, tôi không đồng ý!'.",
        icon: "HandMetal"
      },
      {
        title: "Bước 2: Nhanh chóng rời khỏi khu vực nguy hiểm",
        content: "Di chuyển ngay tới nơi đông người, phòng giáo viên, phòng y tế hoặc khu vực có bảo vệ nhà trường để đảm bảo an toàn thân thể.",
        icon: "Footprints"
      },
      {
        title: "Bước 3: Chia sẻ ngay với người lớn tin cậy",
        content: "Báo ngay cho Thầy Cô giáo chủ nhiệm, Tổng phụ trách Đội, cha mẹ hoặc cán bộ tư vấn tâm lý trường học. Đừng bao giờ im lặng chịu đựng một mình.",
        icon: "MessageCircle"
      },
      {
        title: "Bước 4: Gọi Tổng đài Quốc gia 111 khi khẩn cấp",
        content: "Đường dây nóng 111 hoạt động 24/7, miễn cước cuộc gọi, bảo mật thông tin tuyệt đối, luôn sẵn sàng hỗ trợ mọi trẻ em Việt Nam.",
        icon: "PhoneCall"
      }
    ],
    summaryNote: "Im lặng không phải là cách giải quyết. Tìm kiếm sự trợ giúp đúng lúc là hành động thông minh và dũng cảm!"
  }
];

export const MEDIA_VIDEOS: MediaVideoItem[] = [
  {
    id: "video-1",
    title: "Phim hoạt hình ngắn: 'Ước mơ của Linh và chiếc cờ-lê'",
    duration: "4 phút 30 giây",
    theme: "Xóa bỏ rào cản nghề nghiệp theo giới",
    presenter: "CLB Truyền thông số - THCS Quảng Châu",
    description: "Câu chuyện cảm động về cô bạn học sinh lớp 8 mê say khám phá động cơ ô tô và chế tạo robot, vượt qua những lời can ngăn định kiến để đạt giải sáng tạo kỹ thuật cấp tỉnh.",
    keyTakeaways: [
      "Đam mê khoa học công nghệ không giới hạn bởi giới tính",
      "Sự thấu hiểu và ủng hộ của cha mẹ là điểm tựa lớn nhất",
      "Hãy tự tin cầm lấy 'chiếc cờ-lê' để mở khóa tiềm năng của chính mình"
    ],
    transcriptExcerpt: "Linh nhìn chiếc máy bay giấy vút lên bầu trời xanh và mỉm cười: 'Nếu ai đó bảo con gái không thể thành kỹ sư hàng không, em sẽ chứng minh cho họ thấy con gái có thể vươn cao tới tận các vì sao!'"
  },
  {
    id: "video-2",
    title: "Talkshow học đường: 'Con trai và giọt nước mắt'",
    duration: "5 phút 15 giây",
    theme: "Sức khỏe tinh thần & Giải tỏa áp lực giới cho nam sinh",
    presenter: "Bác sĩ Tâm lý & Thầy giáo Tổng phụ trách Đội",
    description: "Buổi trò chuyện cởi mở giải mã định kiến 'con trai phải luôn mạnh mẽ, không được yếu đuối', giúp các bạn nam sinh THCS biết cách bộc lộ cảm xúc và chăm sóc sức khỏe tinh thần.",
    keyTakeaways: [
      "Khóc không phải là yếu đuối, đó là sự dũng cảm đối diện với tổn thương",
      "Biết lắng nghe và đồng cảm tạo nên người đàn ông tử tế",
      "Chia sẻ cảm xúc giúp tình bạn thêm sâu sắc và bền chặt"
    ],
    transcriptExcerpt: "Mạnh mẽ thực sự không phải là không bao giờ khóc, mà là sau khi khóc xong, em có thể đứng dậy, nhìn thẳng vào thử thách và bước tiếp bằng cả trái tim ấm áp."
  }
];

export const INSPIRING_QUOTES: QuoteItem[] = [
  {
    quote: "Bình đẳng giới không chỉ là một quyền cơ bản của con người, mà còn là nền tảng cần thiết cho một thế giới hòa bình, thịnh vượng và bền vững.",
    author: "Mục tiêu Phát triển Bền vững (SDGs)",
    title: "Liên Hợp Quốc"
  },
  {
    quote: "Không có giới hạn nào cho những gì chúng ta có thể đạt được với tư cách là phụ nữ, nếu chúng ta có cơ hội và niềm tin.",
    author: "Michelle Obama",
    title: "Cựu Đệ nhất phu nhân Mỹ"
  },
  {
    quote: "Thế hệ thanh thiếu niên hôm nay chính là những kiến trúc sư kiến tạo nên một xã hội không rào cản định kiến cho ngày mai.",
    author: "Thông điệp Dự án",
    title: "Trường THCS Quảng Châu, Nghệ An"
  }
];
