import { OFFICIAL_TOPICS, OFFICIAL_PROJECT_INFO } from "./officialData";

export interface KeyConcept {
  term: string;
  definition: string;
  example: string;
}

export interface MythVsFact {
  myth: string;
  fact: string;
  explanation: string;
}

export interface TopicItem {
  id: number;
  code: string;
  title: string;
  objectives: string[];
  badge: string;
  summary: string;
  targetMessage: string;
  icon: string;
  color: string;
  accentBg: string;
  keyConcepts: KeyConcept[];
  mythsVsFacts: MythVsFact[];
  legalBasis: string;
  actionTips: string[];
  statsFact: {
    stat: string;
    label: string;
    source: string;
  };
}

export const TOPICS_DATA: TopicItem[] = [
  {
    id: 1,
    code: "CD01",
    title: "Hiểu đúng về bình đẳng giới",
    objectives: [
      "Nêu được khái niệm bình đẳng giới và định kiến giới",
      "Phân biệt khác biệt cá nhân với định kiến",
      "Biết phản hồi tôn trọng"
    ],
    badge: "Chủ đề 1",
    summary: "Hiểu đúng bản chất của bình đẳng giới: nam và nữ có vị trí, vai trò ngang nhau và có cơ hội công bằng để phát huy năng lực; phân biệt giữa khác biệt cá nhân và định kiến giới thiên lệch.",
    targetMessage: "Bình đẳng giới là cơ hội công bằng và sự tôn trọng lẫn nhau, không áp đặt mọi người phải giống hệt nhau!",
    icon: "Compass",
    color: "text-blue-600",
    accentBg: "bg-blue-50 border-blue-200",
    keyConcepts: [
      {
        term: "Bình đẳng giới",
        definition: "Nam và nữ có vị trí, vai trò ngang nhau, được tôn trọng và có cơ hội công bằng để phát huy năng lực cho sự phát triển của gia đình và xã hội.",
        example: "Mọi học sinh nam và nữ đều có cơ hội bình đẳng được phát biểu, tham gia hoạt động Đội và các sân chơi sáng tạo."
      },
      {
        term: "Định kiến giới",
        definition: "Quan niệm, nhận thức, thái độ hoặc đánh giá thiên lệch, tiêu cực về đặc điểm, vị trí, vai trò và năng lực của nam hoặc nữ một cách máy móc.",
        example: "Nghĩ rằng 'con gái không thể giỏi môn Vật lí' hoặc 'con trai thì không được khóc'."
      },
      {
        term: "Khác biệt cá nhân",
        definition: "Mỗi con người có sở thích, năng khiếu và tính cách riêng biệt, không bị quy định hay giới hạn bởi giới tính bẩm sinh.",
        example: "Bạn nam có thể yêu thích hội họa, cắm hoa; bạn nữ có thể đam mê lập trình, chế tạo mô hình kỹ thuật."
      }
    ],
    mythsVsFacts: [
      {
        myth: "Bình đẳng giới là nam và nữ phải làm mọi việc giống hệt nhau.",
        fact: "Bình đẳng giới nhấn mạnh cơ hội công bằng và sự tôn trọng, chứ không cào bằng sự khác biệt cá nhân.",
        explanation: "Mục tiêu là tạo điều kiện để mỗi người phát triển trọn vẹn năng lực mà không bị rào cản bởi định kiến."
      },
      {
        myth: "Khi nghe câu nói mang định kiến giới, tốt nhất là im lặng hoặc lặp lại để gây cười.",
        fact: "Cần bình tĩnh trao đổi, nêu lý do và tôn trọng người nghe để cùng thay đổi nhận thức.",
        explanation: "Phản hồi ôn hòa, văn minh và tập trung vào hành vi giúp lan tỏa sự hiểu biết và xây dựng môi trường văn minh."
      }
    ],
    legalBasis: "Luật Bình đẳng giới số 73/2006/QH11 (Điều 4, Điều 5, Điều 6).",
    actionTips: [
      "Bình tĩnh trao đổi khi gặp câu nói mang định kiến giới, tránh công kích cá nhân.",
      "Tôn trọng sở thích và năng khiếu riêng của từng bạn trong lớp.",
      "Gương mẫu sử dụng ngôn từ tôn trọng, bình đẳng trong giao tiếp hằng ngày."
    ],
    statsFact: {
      stat: "100%",
      label: "Học sinh nam và nữ đều có quyền tiếp cận nền giáo dục công bằng theo Hiến pháp Việt Nam",
      source: "Điều 26 Hiến pháp Việt Nam & Luật Bình đẳng giới"
    }
  },
  {
    id: 2,
    code: "CD02",
    title: "Bình đẳng giới trong học tập",
    objectives: [
      "Nhận diện định kiến trong môn học và hoạt động",
      "Tôn trọng cơ hội tham gia của mọi học sinh"
    ],
    badge: "Chủ đề 2",
    summary: "Nhận diện và loại bỏ các định kiến trong lựa chọn môn học (STEM, nghệ thuật, thể thao) và phân công hoạt động lớp; tôn trọng cơ hội tham gia công bằng của mọi học sinh.",
    targetMessage: "Cơ hội tiếp cận môn học và hoạt động luôn mở rộng cho tất cả học sinh có đam mê và nỗ lực!",
    icon: "GraduationCap",
    color: "text-teal-600",
    accentBg: "bg-teal-50 border-teal-200",
    keyConcepts: [
      {
        term: "Phân công công việc công bằng",
        definition: "Phân chia nhiệm vụ trực nhật, học nhóm dựa trên năng lực, sở trường, sự tự nguyện và luân phiên, không mặc định theo giới tính.",
        example: "Cả nam và nữ cùng luân phiên lau bảng, kê bàn ghế và phụ trách các phần thuyết trình."
      },
      {
        term: "Cơ hội tham gia STEM",
        definition: "Lắp ráp robot, thí nghiệm khoa học và lập trình dành cho mọi học sinh có kỹ năng và mong muốn, không phân biệt nam hay nữ.",
        example: "Học sinh nữ tham gia nhóm lập trình và lắp ráp mạch điện, học sinh nam tham gia biên tập tài liệu và thuyết trình."
      },
      {
        term: "Tôn trọng sở thích nghệ thuật",
        definition: "Môn múa, âm nhạc, hội họa hay thể thao là không gian sáng tạo tự do cho mọi giới tính.",
        example: "Ủng hộ bạn nam tham gia đội múa dân vũ, ủng hộ bạn nữ tham gia đội tuyển bóng đá học đường."
      }
    ],
    mythsVsFacts: [
      {
        myth: "Trong giờ STEM, chỉ học sinh nam mới có thể đảm nhiệm phần lắp ráp mô hình.",
        fact: "Học sinh có kỹ năng và mong muốn tham gia đều có thể đảm nhiệm, không phân biệt giới tính.",
        explanation: "Khéo léo và tư duy kỹ thuật được rèn luyện qua thực hành và đam mê học hỏi của từng cá nhân."
      },
      {
        myth: "Bạn nữ chỉ nên lau bảng, bạn nam chỉ nên kê bàn ghế vì đó là việc mặc định.",
        fact: "Phân công luân phiên theo khả năng, sức khỏe và sự thống nhất giúp tập thể đoàn kết và bình đẳng.",
        explanation: "Lao động chung là cơ hội rèn luyện tinh thần trách nhiệm và kỹ năng sống cho mọi học sinh."
      }
    ],
    legalBasis: "Luật Bình đẳng giới số 73/2006/QH11 (Điều 10 - Bình đẳng giới trong lĩnh vực giáo dục và đào tạo).",
    actionTips: [
      "Khuyến khích bạn bè cùng thử sức ở các môn học và câu lạc bộ mình yêu thích.",
      "Đánh giá năng lực và nguyện vọng của thành viên nhóm khi phân công thuyết trình.",
      "Tham gia tích cực vào các hoạt động tập thể với tinh thần hợp tác, không đùn đẩy."
    ],
    statsFact: {
      stat: "50:50",
      label: "Mục tiêu cơ hội tiếp cận giáo dục STEM và kỹ năng số công bằng cho học sinh nam và nữ",
      source: "Chương trình Giáo dục Phổ thông 2018 & Kế hoạch ngành GD&ĐT Nghệ An"
    }
  },
  {
    id: 3,
    code: "CD03",
    title: "Bình đẳng giới trong gia đình",
    objectives: [
      "Nhận thức trách nhiệm chia sẻ việc nhà",
      "Đề xuất cách phân công phù hợp"
    ],
    badge: "Chủ đề 3",
    summary: "Nhận thức sâu sắc rằng việc nhà là trách nhiệm chung của các thành viên trong gia đình; đề xuất cách phân công công việc nhà công bằng, hợp lý dựa trên thời gian và khả năng.",
    targetMessage: "Việc nhà là trách nhiệm chung – Chia sẻ việc nhà là biểu hiện đẹp nhất của tình yêu thương gia đình!",
    icon: "HeartHandshake",
    color: "text-amber-600",
    accentBg: "bg-amber-50 border-amber-200",
    keyConcepts: [
      {
        term: "Chia sẻ việc nhà",
        definition: "Các thành viên nam và nữ cùng gánh vác các công việc nội trợ, nấu ăn, quét dọn và chăm sóc gia đình phù hợp với khả năng và thời gian.",
        example: "Anh trai và em gái cùng luân phiên rửa bát, dọn bàn ăn và quét dọn nhà cửa sau giờ học."
      },
      {
        term: "Bình đẳng điều kiện phát triển",
        definition: "Trẻ em trai và trẻ em gái trong gia đình đều được yêu thương, chăm sóc, học tập, vui chơi và phát triển công bằng như nhau.",
        example: "Cha mẹ tạo điều kiện cho con gái và con trai học tập, tham gia thể thao và bồi dưỡng năng khiếu ngang nhau."
      },
      {
        term: "Nấu ăn là kỹ năng sống",
        definition: "Biết chuẩn bị bữa cơm và tự chăm sóc bản thân là kỹ năng tự lập thiết yếu của mọi con người, không phải công việc dành riêng cho nữ giới.",
        example: "Bạn nam chủ động học nấu ăn, giúp mẹ chuẩn bị cơm chiều khi mẹ đi làm đồng hoặc công tác về muộn."
      }
    ],
    mythsVsFacts: [
      {
        myth: "Việc nhà nên giao mặc định cho mẹ và con gái; con trai chỉ nghỉ ngơi hoặc làm việc nặng.",
        fact: "Việc nhà cần được chia sẻ giữa các thành viên phù hợp với khả năng và thời gian thực tế.",
        explanation: "Không ai làm giúp ai; mọi người cùng sinh sống dưới một mái nhà đều có trách nhiệm giữ gìn tổ ấm."
      },
      {
        myth: "Con trai vào bếp phụ mẹ nấu ăn là mất phong độ và đáng bị chê cười.",
        fact: "Nấu ăn là kỹ năng sinh tồn tự lập văn minh, thể hiện sự quan tâm và hiếu thảo với cha mẹ.",
        explanation: "Các đầu bếp danh tiếng thế giới và những người đàn ông hiện đại đều rất tự hào về kỹ năng nấu nướng của mình."
      }
    ],
    legalBasis: "Luật Bình đẳng giới số 73/2006/QH11 (Điều 18 - Bình đẳng giới trong gia đình).",
    actionTips: [
      "Chủ động lập lịch phân công việc nhà trong tuần rõ ràng cùng anh, chị, em.",
      "Học nấu một số món ăn đơn giản và tự giác dọn dẹp góc học tập của mình.",
      "Lên tiếng động viên khi thấy anh trai hoặc em trai chủ động phụ giúp việc nhà."
    ],
    statsFact: {
      stat: "Điều 18",
      label: "Luật Bình đẳng giới quy định các thành viên gia đình có trách nhiệm chia sẻ công việc gia đình",
      source: "Luật Bình đẳng giới số 73/2006/QH11"
    }
  },
  {
    id: 4,
    code: "CD04",
    title: "Bình đẳng giới trong lựa chọn nghề nghiệp",
    objectives: [
      "Nhận diện khuôn mẫu nghề nghiệp",
      "Lựa chọn dựa trên sở thích, năng lực và thông tin"
    ],
    badge: "Chủ đề 4",
    summary: "Xóa bỏ các khuôn mẫu giới áp đặt lên nghề nghiệp; định hướng nghề nghiệp dựa trên năng lực, sở thích, đam mê và thông tin thị trường đáng tin cậy.",
    targetMessage: "Năng lực, đam mê và nỗ lực không bị quyết định bởi định kiến giới – Bầu trời ước mơ rộng mở!",
    icon: "Rocket",
    color: "text-emerald-600",
    accentBg: "bg-emerald-50 border-emerald-200",
    keyConcepts: [
      {
        term: "Căn cứ lựa chọn nghề nghiệp",
        definition: "Học sinh lựa chọn ngành nghề dựa trên sở thích, năng lực, điều kiện bản thân và thông tin thực tế về nghề nghiệp, không theo định kiến giới.",
        example: "Nữ sinh tìm hiểu yêu cầu của ngành kỹ sư công nghệ thông tin; nam sinh tìm hiểu ngành điều dưỡng hoặc thiết kế thời trang."
      },
      {
        term: "Xóa bỏ khuôn mẫu nghề nghiệp",
        definition: "Không gán nhãn nghề này chỉ của nam, nghề kia chỉ của nữ; mọi người đều có thể theo đuổi nghề phù hợp sau khi đáp ứng yêu cầu chuyên môn.",
        example: "Việt Nam có nhiều nữ phi công, nữ kỹ sư xây dựng, cũng như nam điều dưỡng, nam giáo viên tiểu học xuất sắc."
      },
      {
        term: "Truyền thông nghề nghiệp đa dạng",
        definition: "Khi giới thiệu nghề nghiệp, sử dụng hình ảnh và ví dụ phong phú để truyền cảm hứng bình đẳng cho thế hệ trẻ.",
        example: "Minh họa hình ảnh nữ lập trình viên, nam chuyên gia ẩm thực trên cổng thông tin hướng nghiệp trường học."
      }
    ],
    mythsVsFacts: [
      {
        myth: "Ngành công nghệ thông tin và kỹ thuật chỉ phù hợp với nam giới; nữ giới làm sẽ mau già và vất vả.",
        fact: "Mọi người đều có thể theo đuổi nghề phù hợp năng lực sau khi đáp ứng các tiêu chuẩn chuyên môn của ngành.",
        explanation: "Thế giới công nghệ hiện đại rất cần sự sáng tạo, tỉ mỉ và tư duy logic của cả nam và nữ."
      },
      {
        myth: "Nghề điều dưỡng hay mầm non chỉ dành cho phụ nữ, nam giới làm nghề đó không có tương lai.",
        fact: "Nghề nghiệp đòi hỏi chuyên môn, y đức và lòng nhân ái, không phân biệt giới tính của người hành nghề.",
        explanation: "Bất kỳ ai tận tâm và chuyên nghiệp trong công việc đều được xã hội trân trọng và tôn vinh."
      }
    ],
    legalBasis: "Luật Bình đẳng giới số 73/2006/QH11 (Điều 13 - Bình đẳng giới trong lĩnh vực lao động).",
    actionTips: [
      "Khám phá sở thích và năng lực học tập của bản thân qua các bài kiểm tra trắc nghiệm hướng nghiệp.",
      "Động viên bạn bè tự tin theo đuổi ngành nghề yêu thích, không để lời trêu chọc làm lung lay ước mơ.",
      "Chủ động tìm hiểu yêu cầu tuyển sinh và cơ hội phát triển của các ngành nghề hiện đại."
    ],
    statsFact: {
      stat: "100%",
      label: "Công dân có quyền tự do lựa chọn nghề nghiệp phù hợp với năng lực và nguyện vọng của mình",
      source: "Hiến pháp Việt Nam & Bộ luật Lao động"
    }
  },
  {
    id: 5,
    code: "CD05",
    title: "Bình đẳng giới trong môi trường số",
    objectives: [
      "Nhận diện nội dung xúc phạm và định kiến",
      "Tôn trọng quyền riêng tư, bản quyền và an toàn số"
    ],
    badge: "Chủ đề 5",
    summary: "Xây dựng văn hóa ứng xử văn minh trên không gian mạng: nhận diện nội dung xúc phạm định kiến giới, bảo vệ quyền riêng tư, tuân thủ bản quyền và bảo đảm an toàn số cho học sinh.",
    targetMessage: "Không gian mạng văn minh: Không phát tán nội dung gây hại – Tôn trọng quyền riêng tư và an toàn của bạn bè!",
    icon: "Sparkles",
    color: "text-indigo-600",
    accentBg: "bg-indigo-50 border-indigo-200",
    keyConcepts: [
      {
        term: "An toàn số và phòng chống xúc phạm",
        definition: "Không đăng tải, chia sẻ hoặc hùa theo các nội dung chế giễu, miệt thị giới tính hoặc ngoại hình của người khác trên mạng xã hội.",
        example: "Khi thấy bài viết chế giễu bạn vì bạn không theo khuôn mẫu giới, lập tức báo cáo vi phạm và không chia sẻ."
      },
      {
        term: "Tôn trọng quyền riêng tư",
        definition: "Xin phép người liên quan trước khi sử dụng hình ảnh, câu chuyện cá nhân và hạn chế tối đa các thông tin nhận diện nhạy cảm.",
        example: "Hỏi ý kiến bạn trước khi đăng ảnh tập thể lớp lên website hoặc mạng xã hội."
      },
      {
        term: "Bản quyền và đạo đức truyền thông số",
        definition: "Ghi nguồn rõ ràng, kiểm tra quyền sử dụng hình ảnh và ưu tiên các tài nguyên mở được phép sử dụng.",
        example: "Sử dụng hình ảnh tự vẽ hoặc ghi rõ nguồn trích dẫn khi thiết kế infographic bình đẳng giới."
      }
    ],
    mythsVsFacts: [
      {
        myth: "Đăng ảnh chế giễu bạn trên mạng chỉ là đùa vui, trên mạng ảo không ai bị tổn thương thật.",
        fact: "Bạo lực mạng gây tổn thương tâm lý rất sâu sắc và vi phạm nghiêm trọng quy tắc an toàn học đường.",
        explanation: "Không gian mạng đòi hỏi trách nhiệm công dân số thực thụ. Mọi hành vi làm tổn thương bạn bè đều để lại hậu quả xấu."
      },
      {
        myth: "Vì mục đích tuyên truyền bình đẳng giới tốt đẹp, ta có thể tự ý đăng câu chuyện và ảnh cá nhân của bạn mà không cần hỏi.",
        fact: "Mục đích giáo dục không thể thay thế sự đồng ý và yêu cầu bảo vệ quyền riêng tư của cá nhân.",
        explanation: "Tôn trọng quyền con người và quyền riêng tư là nguyên tắc đạo đức hàng đầu trong truyền thông số."
      }
    ],
    legalBasis: "Luật Trẻ em 2016 (Điều 54) & Luật An toàn thông tin mạng.",
    actionTips: [
      "Không bao giờ like, chia sẻ hoặc bình luận hùa theo các nội dung bêu riếu ngoại hình hay giới tính.",
      "Lưu lại bằng chứng và báo ngay cho giáo viên hoặc người lớn tin cậy khi phát hiện hành vi quấy rối mạng.",
      "Ghi nhớ Tổng đài Quốc gia Bảo vệ Trẻ em 111 để tìm kiếm sự hỗ trợ khi cần thiết."
    ],
    statsFact: {
      stat: "24/7",
      label: "Tổng đài Quốc gia 111 sẵn sàng hỗ trợ, tư vấn bảo vệ trẻ em trên môi trường trực tuyến",
      source: "Cục Trẻ em - Bộ LĐ-TB&XH"
    }
  },
  {
    id: 6,
    code: "CD06",
    title: "Hành động vì môi trường bình đẳng",
    objectives: [
      "Biết hỗ trợ bạn bị phân biệt đối xử",
      "Đề xuất hành động tích cực và đánh giá tác động"
    ],
    badge: "Chủ đề 6",
    summary: "Biến nhận thức thành hành động thiết thực: dũng cảm hỗ trợ bạn bè khi bị phân biệt đối xử, đưa ra các cam kết tích cực khả thi và biết cách đánh giá tác động trung thực của chiến dịch truyền thông.",
    targetMessage: "Hành động nhỏ tạo nên thay đổi lớn – Cùng nhau kiến tạo môi trường học đường yêu thương và bình đẳng!",
    icon: "Scale",
    color: "text-cyan-700",
    accentBg: "bg-cyan-50 border-cyan-200",
    keyConcepts: [
      {
        term: "Hỗ trợ bạn bè an toàn",
        definition: "Khi chứng kiến bạn bị trêu chọc vì giới tính hoặc biểu hiện giới: không hùa theo, nếu an toàn hãy yêu cầu dừng lại, ở bên cạnh hỗ trợ bạn và báo giáo viên.",
        example: "Đến bên cạnh an ủi bạn bị trêu và cùng bạn lên phòng Đoàn Đội để báo cáo thầy cô hỗ trợ."
      },
      {
        term: "Cam kết cá nhân thiết thực",
        definition: "Những lời hứa hành động cụ thể, khả thi trong đời sống hằng ngày: biết lắng nghe, không dùng lời nói định kiến, chủ động chia sẻ việc chung.",
        example: "Cam kết mỗi ngày chia sẻ việc quét nhà, rửa bát cùng gia đình và không bao giờ trêu chọc ngoại hình bạn bè."
      },
      {
        term: "Đánh giá tác động trung thực",
        definition: "Thu thập phản hồi tự nguyện và so sánh hiểu biết trước - sau bằng câu hỏi phù hợp; báo cáo trung thực phạm vi khảo sát, không suy rộng quá mức từ mẫu nhỏ.",
        example: "Khảo sát 25 bạn thì báo cáo đúng số liệu 25 bạn, không tự ý tuyên bố đại diện cho toàn bộ trường."
      }
    ],
    mythsVsFacts: [
      {
        myth: "Khi thấy bạn bị bắt nạt, cách tốt nhất là quay video đăng lên mạng để câu like và chỉ trích.",
        fact: "Cần bảo vệ người bị ảnh hưởng trước tiên, không lan truyền nội dung gây tổn thương và nhờ người lớn can thiệp.",
        explanation: "Phát tán video bắt nạt càng làm nhân đôi nỗi đau cho nạn nhân và có thể vi phạm pháp luật."
      },
      {
        myth: "Muốn chiến dịch có thành tích cao, nhóm có thể tự tuyên bố toàn trường đã thay đổi hoàn toàn sau một buổi tuyên truyền.",
        fact: "Đánh giá khoa học đòi hỏi sự trung thực, dựa trên phản hồi khách quan và nêu rõ hạn chế của số liệu.",
        explanation: "Trung thực trong nghiên cứu và truyền thông là phẩm chất quan trọng hàng đầu của thanh thiếu niên."
      }
    ],
    legalBasis: "Luật Bình đẳng giới số 73/2006/QH11 (Điều 23) & Công văn 4422/SGD&ĐT-TCCB ngày 04/11/2026.",
    actionTips: [
      "Tham gia ký cam kết hành động bình đẳng giới của Trường THCS Quảng Châu.",
      "Chủ động chia sẻ các thông điệp tích cực tới bạn bè cùng lớp và người thân.",
      "Luôn giữ thái độ trung thực, khách quan khi thu thập và báo cáo dữ liệu khảo sát."
    ],
    statsFact: {
      stat: "4422",
      label: "Số Công văn SGD&ĐT-TCCB phát động sân chơi Thanh thiếu niên kiến tạo thay đổi vì bình đẳng giới",
      source: "Sở Giáo dục & Đào tạo Nghệ An"
    }
  }
];

export { OFFICIAL_PROJECT_INFO };
